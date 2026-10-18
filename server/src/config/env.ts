import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Comma-separated list of browser origins allowed to call the API with credentials.
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  SESSION_TTL_REMEMBER_DAYS: z.coerce.number().positive().default(30),
  // lax works when client and API share a site (or API serves the client); use "none" for separate Railway domains.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  SERVE_CLIENT: z.enum(['true', 'false']).default('false'),
  CLIENT_DIST_DIR: z.string().default('../client/dist'),
  UPLOAD_STORAGE_PROVIDER: z.enum(['none', 's3']).default('none'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  // Password reset email is only offered when an SMTP/email provider is integrated (it is not, by default).
  PASSWORD_RESET_MODE: z.enum(['disabled', 'demo']).default('disabled'),
  LOG_LEVEL: z.string().default('info'),
});

export const env = schema.parse(process.env);
export const isProd = env.NODE_ENV === 'production';
export const clientOrigins = env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean);
