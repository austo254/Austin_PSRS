import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { badRequest } from './errors.js';

export const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };

/** Parse with zod, converting failures to a 400 with per-field messages. */
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
    throw badRequest('Please correct the highlighted fields', fields);
  }
  return result.data;
}
