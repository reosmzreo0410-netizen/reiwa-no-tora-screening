import { Worker, Job } from 'bullmq';
import { redis } from '../utils/redis';
import { db } from '../db';
import { videoAnswers, questions, evaluations, applicants } from '../db/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EvaluationJobData {
  applicantId: number;
}

interface DetailedScores {
  passion: number;          // 熱意・志望動機
  businessPlan: number;     // 事業計画の具体性
  vision: number;           // ビジョン・将来性
  problemSolving: number;   // 課題認識・解決力
  strength: number;         // 強み・差別化
}

interface EvaluationResult {
  totalScore: number;
  detailedScores: DetailedScores;
  aiComment: string;
}

const EVALUATION_PROMPT = `あなたはSNS版「令和の虎」の審査員AIです。
志願者の動画回答の文字起こしを評価し、JSON形式で採点結果を返してください。

【評価基準】各項目100点満点
1. passion (熱意・志望動機): なぜ応募したのか、その熱意が伝わるか
2. businessPlan (事業計画の具体性): 事業内容が具体的で実現可能性があるか
3. vision (ビジョン・将来性): 事業の将来像が明確で魅力的か
4. problemSolving (課題認識・解決力): 現状の課題を理解し、解決策を考えているか
5. strength (強み・差別化): 自身の強みを理解し、事業に活かせるか

【出力形式】
以下のJSON形式で出力してください:
{
  "totalScore": <5項目の平均点(整数)>,
  "detailedScores": {
    "passion": <点数>,
    "businessPlan": <点数>,
    "vision": <点数>,
    "problemSolving": <点数>,
    "strength": <点数>
  },
  "aiComment": "<200文字程度の総合コメント。良い点と改善点を含める>"
}

【志願者の回答】
`;

async function evaluateApplicant(applicantId: number): Promise<EvaluationResult> {
  // Get all transcriptions for this applicant
  const answers = await db
    .select({
      transcription: videoAnswers.transcription,
      questionText: questions.questionText,
      orderNumber: questions.orderNumber,
    })
    .from(videoAnswers)
    .innerJoin(questions, eq(videoAnswers.questionId, questions.id))
    .where(eq(videoAnswers.applicantId, applicantId))
    .orderBy(questions.orderNumber);

  // Format transcriptions
  const transcriptionsText = answers
    .map((a, i) => `質問${i + 1}: ${a.questionText}\n回答: ${a.transcription || '(回答なし)'}`)
    .join('\n\n');

  const prompt = EVALUATION_PROMPT + transcriptionsText;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'あなたは公平で厳格な審査員です。JSONのみを出力してください。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  return JSON.parse(content) as EvaluationResult;
}

const worker = new Worker<EvaluationJobData>(
  'evaluation',
  async (job: Job<EvaluationJobData>) => {
    const { applicantId } = job.data;

    console.log(`Processing evaluation for applicant ${applicantId}`);

    // Check if evaluation already exists
    const existing = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.applicantId, applicantId));

    if (existing.length > 0) {
      // Update status to processing
      await db
        .update(evaluations)
        .set({ evaluationStatus: 'processing' })
        .where(eq(evaluations.applicantId, applicantId));
    } else {
      // Create new evaluation record
      await db.insert(evaluations).values({
        applicantId,
        evaluationStatus: 'processing',
      });
    }

    try {
      const result = await evaluateApplicant(applicantId);

      // Update evaluation
      await db
        .update(evaluations)
        .set({
          totalScore: result.totalScore,
          detailedScores: result.detailedScores,
          aiComment: result.aiComment,
          evaluationStatus: 'completed',
        })
        .where(eq(evaluations.applicantId, applicantId));

      // Update applicant status
      await db
        .update(applicants)
        .set({ status: 'evaluated' })
        .where(eq(applicants.id, applicantId));

      console.log(`Evaluation completed for applicant ${applicantId}`);

      return { success: true, result };
    } catch (error) {
      console.error(`Evaluation failed for applicant ${applicantId}:`, error);

      await db
        .update(evaluations)
        .set({ evaluationStatus: 'failed' })
        .where(eq(evaluations.applicantId, applicantId));

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 1,
  }
);

worker.on('completed', (job) => {
  console.log(`Evaluation job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Evaluation job ${job?.id} failed:`, err);
});

export { worker as evaluationWorker };
