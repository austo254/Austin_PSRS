import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../utils/errors.js';
import { isProd } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

// Centralised error handler: consistent JSON shape, generic messages for unexpected errors in production.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'The image is too large' : 'Invalid file upload';
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message } });
  }
  if ((err as any)?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' } });
  }
  logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL', message: isProd ? 'Something went wrong. Please try again.' : String((err as Error)?.message ?? err) },
  });
}
