import 'dotenv/config';
import { transcriptionWorker } from './transcription.worker';
import { evaluationWorker } from './evaluation.worker';

console.log('Starting workers...');
console.log('Transcription worker started');
console.log('Evaluation worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing workers...');
  await transcriptionWorker.close();
  await evaluationWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing workers...');
  await transcriptionWorker.close();
  await evaluationWorker.close();
  process.exit(0);
});
