import { Router } from 'express';
import { db } from '../db';
import { applicants } from '../db/schema';
import { z } from 'zod';

const router = Router();

const createApplicantSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  businessPlanUrl: z.string().url().optional(),
});

// POST /api/applicants - 新規志願者登録
router.post('/', async (req, res) => {
  try {
    const validatedData = createApplicantSchema.parse(req.body);

    const result = await db.insert(applicants).values({
      name: validatedData.name,
      email: validatedData.email,
      businessPlanUrl: validatedData.businessPlanUrl,
    });

    const applicantId = result[0].insertId;

    res.status(201).json({
      id: applicantId,
      message: '応募者情報を登録しました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error creating applicant:', error);
    res.status(500).json({ error: '登録に失敗しました' });
  }
});

export default router;
