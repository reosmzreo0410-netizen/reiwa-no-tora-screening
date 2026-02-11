import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import applicantsRouter from './routes/applicants';
import questionsRouter from './routes/questions';
import videoAnswersRouter from './routes/video-answers';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/applicants', applicantsRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/video-answers', videoAnswersRouter);
app.use('/api/admin', adminRouter);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
