import { Worker, Job } from 'bullmq';
import { redis } from '../utils/redis';
import { db } from '../db';
import { videoAnswers, questions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { evaluationQueue } from './queues';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface TranscriptionJobData {
  videoAnswerId: number;
  videoUrl: string;
  applicantId: number;
  questionId: number;
}

async function transcribeVideo(videoUrl: string): Promise<string> {
  try {
    // Fetch video from URL
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64Video = Buffer.from(arrayBuffer).toString('base64');

    // Use Gemini 1.5 Flash for video transcription
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'video/webm',
          data: base64Video,
        },
      },
      {
        text: `この動画の音声を正確に文字起こししてください。
話者が言った言葉をそのまま書き起こしてください。
説明や解釈は不要です。音声の内容のみを出力してください。`,
      },
    ]);

    const transcription = result.response.text();
    return transcription;
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

    await db
      .update(videoAnswers)
      .set({ transcriptionStatus: 'processing' })
      .where(eq(videoAnswers.id, videoAnswerId));

    try {
      const transcription = await transcribeVideo(videoUrl);

      await db
        .update(videoAnswers)
        .set({
          transcription,
          transcriptionStatus: 'completed',
        })
        .where(eq(videoAnswers.id, videoAnswerId));

      console.log(`Transcription completed for video answer ${videoAnswerId}`);

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
