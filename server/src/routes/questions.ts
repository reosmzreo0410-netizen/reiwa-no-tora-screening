import { Router } from 'express';
import { db } from '../db';
import { questions } from '../db/schema';
import { asc } from 'drizzle-orm';

const router = Router();

// GET /api/questions - 質問一覧取得
router.get('/', async (_req, res) => {
  try {
    const allQuestions = await db
      .select()
      .from(questions)
      .orderBy(asc(questions.orderNumber));

    res.json(allQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: '質問の取得に失敗しました' });
  }
});

export default router;
