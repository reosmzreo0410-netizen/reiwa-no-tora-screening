import express from 'express';
import cors from 'cors';
import { db } from '../server/src/db';
import { applicants, questions, videoAnswers, evaluations, adminUsers } from '../server/src/db/schema';
import { eq, desc, asc, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: number };
    req.adminId = decoded.adminId;
    next();
  } catch {
    return res.status(401).json({ error: 'トークンが無効です' });
  }
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Applicants
app.post('/api/applicants', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });
    const data = schema.parse(req.body);
    const result = await db.insert(applicants).values(data);
    res.status(201).json({ id: result[0].insertId, message: '応募者情報を登録しました' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: '登録に失敗しました' });
  }
});

// Questions
app.get('/api/questions', async (_req, res) => {
  try {
    const allQuestions = await db.select().from(questions).orderBy(asc(questions.orderNumber));
    res.json(allQuestions);
  } catch {
    res.status(500).json({ error: '質問の取得に失敗しました' });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const schema = z.object({ username: z.string(), password: z.string() });
    const data = schema.parse(req.body);
    const adminList = await db.select().from(adminUsers).where(eq(adminUsers.username, data.username));
    if (adminList.length === 0) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }
    const admin = adminList[0];
    const isValid = await bcrypt.compare(data.password, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }
    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, admin: { id: admin.id, username: admin.username, email: admin.email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

// Admin applicants list
app.get('/api/admin/applicants', authMiddleware, async (_req, res) => {
  try {
    const list = await db
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
    res.json(list);
  } catch {
    res.status(500).json({ error: '応募者一覧の取得に失敗しました' });
  }
});

// Admin applicant detail
app.get('/api/admin/applicants/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const applicantList = await db.select().from(applicants).where(eq(applicants.id, id));
    if (applicantList.length === 0) {
      return res.status(404).json({ error: '応募者が見つかりません' });
    }
    const evalList = await db.select().from(evaluations).where(eq(evaluations.applicantId, id));
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
      .where(eq(videoAnswers.applicantId, id))
      .orderBy(questions.orderNumber);
    res.json({
      applicant: applicantList[0],
      evaluation: evalList.length > 0 ? evalList[0] : null,
      videoAnswers: answers,
    });
  } catch {
    res.status(500).json({ error: '応募者詳細の取得に失敗しました' });
  }
});

// Update status
app.put('/api/admin/applicants/:id/status', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const validStatuses = ['pending', 'video_submitted', 'evaluated', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '無効なステータスです' });
    }
    await db.update(applicants).set({ status }).where(eq(applicants.id, id));
    res.json({ message: 'ステータスを更新しました' });
  } catch {
    res.status(500).json({ error: 'ステータスの更新に失敗しました' });
  }
});

export default app;
