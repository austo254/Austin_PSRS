import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const make = (windowMs: number, limit: number, message: string) => rateLimit({
  windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: { code: 'RATE_LIMITED', message } },
});

export const authLimiter = make(15 * 60_000, 20, 'Too many attempts. Please try again in a few minutes.');
export const apiLimiter = make(60_000, 300, 'Too many requests. Please slow down.');
