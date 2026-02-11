import { Queue } from 'bullmq';
import { redis } from '../utils/redis';

export const transcriptionQueue = new Queue('transcription', {
  connection: redis,
});

export const evaluationQueue = new Queue('evaluation', {
  connection: redis,
});
