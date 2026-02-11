import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoRecorder from '../components/VideoRecorder';
import api from '../utils/api';

interface Question {
  id: number;
  questionText: string;
  orderNumber: number;
  isRequired: boolean;
  maxDurationSeconds: number;
}

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideos, setUploadedVideos] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  const applicantId = sessionStorage.getItem('applicantId');

  useEffect(() => {
    if (!applicantId) {
      navigate('/apply');
      return;
    }

    const fetchQuestions = async () => {
      try {
        const response = await api.get('/questions');
        setQuestions(response.data);
      } catch (err) {
        setError('質問の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [applicantId, navigate]);

  const handleRecordingComplete = async (blob: Blob) => {
    if (!applicantId) return;

    const currentQuestion = questions[currentQuestionIndex];
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', blob, `question_${currentQuestion.id}.webm`);
      formData.append('applicantId', applicantId);
      formData.append('questionId', currentQuestion.id.toString());

      await api.post('/video-answers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadedVideos((prev) => new Set([...prev, currentQuestion.id]));
    } catch (err: any) {
      setError(err.response?.data?.error || 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!applicantId) return;

    setIsUploading(true);
    try {
      await api.post('/video-answers/complete', { applicantId: parseInt(applicantId) });
      sessionStorage.removeItem('applicantId');
      navigate('/apply/complete');
    } catch (err: any) {
      setError(err.response?.data?.error || '応募の完了に失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isCurrentQuestionUploaded = uploadedVideos.has(currentQuestion?.id);
  const allQuestionsAnswered = questions.every((q) => uploadedVideos.has(q.id));

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            動画質問回答
          </h1>
          <div className="flex justify-center items-center space-x-2 mb-4">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i === currentQuestionIndex
                    ? 'bg-gold-500 text-white'
                    : uploadedVideos.has(q.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {uploadedVideos.has(q.id) ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>

        {currentQuestion && (
          <div className="card mb-6">
            <div className="mb-6">
              <span className="text-sm text-gold-600 font-medium">
                質問 {currentQuestionIndex + 1} / {questions.length}
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">
                {currentQuestion.questionText}
              </h2>
            </div>

            {isCurrentQuestionUploaded ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-green-500 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-green-700 font-medium">
                  この質問への回答は完了しています
                </p>
              </div>
            ) : (
              <VideoRecorder
                maxDuration={currentQuestion.maxDurationSeconds}
                onRecordingComplete={handleRecordingComplete}
              />
            )}

            {isUploading && (
              <div className="mt-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mx-auto mb-2" />
                アップロード中...
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前の質問
          </button>

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!isCurrentQuestionUploaded}
              className="btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次の質問
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!allQuestionsAnswered || isUploading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              応募を完了する
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
