import crypto from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

export interface StorageProvider {
  put(buffer: Buffer, ext: string, mime: string): Promise<string>; // returns a public URL
}

/** Uploads need persistent object storage (Railway's filesystem is ephemeral). Disabled unless configured. */
export function createStorage(): StorageProvider | null {
  if (env.UPLOAD_STORAGE_PROVIDER !== 's3') return null;
  const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL } = env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_BASE_URL) return null;
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: !!env.S3_ENDPOINT,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  return {
    async put(buffer, ext, mime) {
      const key = `requests/${crypto.randomUUID()}.${ext}`; // server-generated name; user filename is never used
      await client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: mime }));
      return `${S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
    },
  };
}

let storage: StorageProvider | null = createStorage();
export const getStorage = () => storage;
/** Test hook: inject an in-memory provider. */
export const setStorage = (s: StorageProvider | null) => { storage = s; };
