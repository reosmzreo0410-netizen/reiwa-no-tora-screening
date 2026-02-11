import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

interface VideoRecorderProps {
  maxDuration: number;
  onRecordingComplete: (blob: Blob) => void;
}

export default function VideoRecorder({ maxDuration, onRecordingComplete }: VideoRecorderProps) {
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [remainingTime, setRemainingTime] = useState(maxDuration);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartRecording = useCallback(() => {
    setRecordedChunks([]);
    setRecordedVideo(null);
    setRemainingTime(maxDuration);

    const stream = webcamRef.current?.video?.srcObject as MediaStream;
    if (!stream) return;

    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'video/webm',
    });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);

    // Start countdown timer
    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          handleStopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [maxDuration]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleSaveRecording = useCallback(() => {
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      setRecordedVideo(URL.createObjectURL(blob));
      onRecordingComplete(blob);
    }
  }, [recordedChunks, onRecordingComplete]);

  const handleRetry = useCallback(() => {
    setRecordedChunks([]);
    setRecordedVideo(null);
    setRemainingTime(maxDuration);
  }, [maxDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // When recording stops, automatically process the video
  if (!isRecording && recordedChunks.length > 0 && !recordedVideo) {
    setTimeout(handleSaveRecording, 100);
  }

  return (
    <div className="space-y-4">
      {!recordedVideo ? (
        <>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <Webcam
              ref={webcamRef}
              audio={true}
              videoConstraints={{
                width: 1280,
                height: 720,
                facingMode: 'user',
              }}
              className="w-full h-full object-cover"
            />
            {isRecording && (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center space-x-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="font-mono">{formatTime(remainingTime)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center space-x-4">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="btn-primary flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="6" />
                </svg>
                <span>録画開始</span>
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="5" y="5" width="10" height="10" />
                </svg>
                <span>録画停止</span>
              </button>
            )}
          </div>

          <p className="text-center text-gray-500 text-sm">
            最大録画時間: {formatTime(maxDuration)}
          </p>
        </>
      ) : (
        <>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={recordedVideo}
              controls
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleRetry}
              className="btn-secondary"
            >
              撮り直す
            </button>
          </div>
        </>
      )}
    </div>
  );
}
