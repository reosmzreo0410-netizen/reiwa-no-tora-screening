import { Worker, Job } from 'bullmq';
import { redis } from '../utils/redis';
import { db } from '../db';
import { videoAnswers, questions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { evaluationQueue } from './queues';
import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TranscriptionJobData {
  videoAnswerId: number;
  videoUrl: string;
  applicantId: number;
  questionId: number;
}

async function transcribeVideo(videoUrl: string): Promise<string> {
  // Download video from S3 and transcribe using Whisper
  // For production, you'd download the video and send to Whisper API
  // Here we'll use a simplified approach with the URL

  try {
    // Fetch video from URL
    const response = await fetch(videoUrl);
    const blob = await response.blob();

    // Create a File object for OpenAI
    const file = new File([blob], 'video.webm', { type: 'video/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'ja',
    });

    return transcription.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

async function checkAllTranscriptionsComplete(applicantId: number): Promise<boolean> {
  const answers = await db
    .select()
    .from(videoAnswers)
    .where(eq(videoAnswers.applicantId, applicantId));

  const allQuestions = await db.select().from(questions);

  // Check if all required questions have completed transcriptions
  const completedCount = answers.filter(
    a => a.transcriptionStatus === 'completed'
  ).length;

  return completedCount >= allQuestions.length;
}

const worker = new Worker<TranscriptionJobData>(
  'transcription',
  async (job: Job<TranscriptionJobData>) => {
    const { videoAnswerId, videoUrl, applicantId } = job.data;

    console.log(`Processing transcription for video answer ${videoAnswerId}`);

    // Update status to processing
    await db
      .update(videoAnswers)
      .set({ transcriptionStatus: 'processing' })
      .where(eq(videoAnswers.id, videoAnswerId));

    try {
      const transcription = await transcribeVideo(videoUrl);

      // Update with transcription result
      await db
        .update(videoAnswers)
        .set({
          transcription,
          transcriptionStatus: 'completed',
        })
        .where(eq(videoAnswers.id, videoAnswerId));

      console.log(`Transcription completed for video answer ${videoAnswerId}`);

      // Check if all transcriptions are complete
      const allComplete = await checkAllTranscriptionsComplete(applicantId);

      if (allComplete) {
        console.log(`All transcriptions complete for applicant ${applicantId}, starting evaluation`);
        await evaluationQueue.add('evaluate', { applicantId });
      }

      return { success: true, transcription };
    } catch (error) {
      console.error(`Transcription failed for video answer ${videoAnswerId}:`, error);

      await db
        .update(videoAnswers)
        .set({ transcriptionStatus: 'failed' })
        .where(eq(videoAnswers.id, videoAnswerId));

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

worker.on('completed', (job) => {
  console.log(`Transcription job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Transcription job ${job?.id} failed:`, err);
});

export { worker as transcriptionWorker };
