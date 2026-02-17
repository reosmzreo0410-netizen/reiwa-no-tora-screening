import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

// Cloudflare R2 configuration (S3 compatible)
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.R2_BUCKET_NAME || 'reiwatora';

export async function uploadVideoToS3(
  buffer: Buffer,
  originalName: string,
  applicantId: number,
  questionId: number
): Promise<string> {
  const extension = originalName.split('.').pop() || 'webm';
  const key = `videos/${applicantId}/${questionId}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: `video/${extension}`,
  });

  await s3Client.send(command);

  // Return the public URL (R2 public access needs to be enabled for this)
  return `${process.env.R2_ENDPOINT}/${bucketName}/${key}`;
}

export async function getSignedVideoUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export { s3Client, bucketName };
