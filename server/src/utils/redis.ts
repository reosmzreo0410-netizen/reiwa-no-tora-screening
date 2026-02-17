import Redis from 'ioredis';
import 'dotenv/config';

// Upstash Redis URL (TLS enabled)
const redisUrl = process.env.REDIS_URL;

export const redis = new Redis(redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: redisUrl?.startsWith('rediss://') ? {} : undefined,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});
