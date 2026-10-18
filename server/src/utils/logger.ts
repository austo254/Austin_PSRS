import pino from 'pino';
import { env } from '../config/env.js';

// Redact anything that could carry credentials; never log request bodies.
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]', 'req.headers["x-csrf-token"]'],
});
