import { Router } from 'express';
import multer from 'multer';
import { db } from '../db';
import { videoAnswers, applicants } from '../db/schema';
import { uploadVideoToS3 } from '../utils/s3';
import { transcriptionQueue } from '../jobs/queues';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Multer configuration for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('動画ファイルのみアップロード可能です'));
    }
  },
});

const videoAnswerSchema = z.object({
  applicantId: z.coerce.number().positive(),
  questionId: z.coerce.number().positive(),
});

// POST /api/video-answers - 動画アップロード
router.post('/', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '動画ファイルが必要です' });
    }

    const validatedData = videoAnswerSchema.parse(req.body);

    // Upload to S3
    const videoUrl = await uploadVideoToS3(
      req.file.buffer,
      req.file.originalname,
      validatedData.applicantId,
      validatedData.questionId
    );

    // Check if answer already exists
    const existing = await db
      .select()
      .from(videoAnswers)
      .where(
        and(
          eq(videoAnswers.applicantId, validatedData.applicantId),
          eq(videoAnswers.questionId, validatedData.questionId)
        )
      );

    let videoAnswerId: number;

    if (existing.length > 0) {
      // Update existing
      await db
        .update(videoAnswers)
        .set({ videoUrl, transcriptionStatus: 'pending' })
        .where(eq(videoAnswers.id, existing[0].id));
      videoAnswerId = existing[0].id;
    } else {
      // Insert new
      const result = await db.insert(videoAnswers).values({
        applicantId: validatedData.applicantId,
        questionId: validatedData.questionId,
        videoUrl,
      });
      videoAnswerId = result[0].insertId;
    }

    // Add transcription job to queue
    await transcriptionQueue.add('transcribe', {
      videoAnswerId,
      videoUrl,
      applicantId: validatedData.applicantId,
      questionId: validatedData.questionId,
    });

    res.status(201).json({
      id: videoAnswerId,
      videoUrl,
      message: '動画をアップロードしました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error uploading video:', error);
    res.status(500).json({ error: '動画のアップロードに失敗しました' });
  }
});

// POST /api/video-answers/complete - 全動画アップロード完了
router.post('/complete', async (req, res) => {
  try {
    const { applicantId } = req.body;

    if (!applicantId) {
      return res.status(400).json({ error: 'applicantIdが必要です' });
    }

    // Update applicant status
    await db
      .update(applicants)
      .set({ status: 'video_submitted' })
      .where(eq(applicants.id, applicantId));

    res.json({ message: '応募が完了しました' });
  } catch (error) {
    console.error('Error completing submission:', error);
    res.status(500).json({ error: '応募の完了に失敗しました' });
  }
});

export default router;
