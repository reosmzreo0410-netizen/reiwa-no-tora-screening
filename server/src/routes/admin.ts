import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { adminUsers, applicants, evaluations, videoAnswers, questions } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/admin/login - 管理者ログイン
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const adminList = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, validatedData.username));

    if (adminList.length === 0) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }

    const admin = adminList[0];
    const isValidPassword = await bcrypt.compare(validatedData.password, admin.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }

    const token = generateToken(admin.id);

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

// GET /api/admin/applicants - 応募者一覧取得
router.get('/applicants', authMiddleware, async (_req: AuthRequest, res) => {
  try {
    const applicantsList = await db
      .select({
        id: applicants.id,
        name: applicants.name,
        email: applicants.email,
        status: applicants.status,
        createdAt: applicants.createdAt,
        totalScore: evaluations.totalScore,
        evaluationStatus: evaluations.evaluationStatus,
      })
      .from(applicants)
      .leftJoin(evaluations, eq(applicants.id, evaluations.applicantId))
      .orderBy(desc(applicants.createdAt));

    res.json(applicantsList);
  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({ error: '応募者一覧の取得に失敗しました' });
  }
});

// GET /api/admin/applicants/:id - 応募者詳細取得
router.get('/applicants/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const applicantId = parseInt(req.params.id, 10);

    // Get applicant
    const applicantList = await db
      .select()
      .from(applicants)
      .where(eq(applicants.id, applicantId));

    if (applicantList.length === 0) {
      return res.status(404).json({ error: '応募者が見つかりません' });
    }

    const applicant = applicantList[0];

    // Get evaluation
    const evaluationList = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.applicantId, applicantId));

    const evaluation = evaluationList.length > 0 ? evaluationList[0] : null;

    // Get video answers with questions
    const answers = await db
      .select({
        id: videoAnswers.id,
        videoUrl: videoAnswers.videoUrl,
        transcription: videoAnswers.transcription,
        transcriptionStatus: videoAnswers.transcriptionStatus,
        questionId: videoAnswers.questionId,
        questionText: questions.questionText,
        orderNumber: questions.orderNumber,
      })
      .from(videoAnswers)
      .innerJoin(questions, eq(videoAnswers.questionId, questions.id))
      .where(eq(videoAnswers.applicantId, applicantId))
      .orderBy(questions.orderNumber);

    res.json({
      applicant,
      evaluation,
      videoAnswers: answers,
    });
  } catch (error) {
    console.error('Error fetching applicant detail:', error);
    res.status(500).json({ error: '応募者詳細の取得に失敗しました' });
  }
});

// PUT /api/admin/applicants/:id/status - 応募者ステータス更新
router.put('/applicants/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const applicantId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const validStatuses = ['pending', 'video_submitted', 'evaluated', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '無効なステータスです' });
    }

    await db
      .update(applicants)
      .set({ status })
      .where(eq(applicants.id, applicantId));

    res.json({ message: 'ステータスを更新しました' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'ステータスの更新に失敗しました' });
  }
});

export default router;
