import type { NextFunction, Request, Response } from 'express';
import { findSession, SESSION_COOKIE } from '../modules/auth/session.service.js';
import { forbidden, unauthorized } from '../utils/errors.js';
import { clientOrigins } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Loads the session (if any) from the HTTP-only cookie. Does not reject anonymous requests. */
export async function loadSession(req: Request, _res: Response, next: NextFunction) {
  try {
    const token: string | undefined = req.cookies?.[SESSION_COOKIE];
    if (token) {
      const found = await findSession(token);
      if (found) req.auth = { user: found.user, sessionToken: token, csrfToken: found.session.csrfToken };
    }
    next();
  } catch (e) { next(e); }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());
  next();
}

export function requireRole(role: 'ADMIN' | 'CITIZEN') {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (req.auth.user.role !== role) return next(forbidden());
    next();
  };
}

/**
 * CSRF defence in depth for cookie sessions:
 *  1. If an Origin header is present on a state-changing request it must be an allowed origin or the API's own host.
 *  2. Authenticated state-changing requests must echo the per-session token in X-CSRF-Token.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin) {
    const sameHost = (() => { try { return new URL(origin).host === req.get('host'); } catch { return false; } })();
    if (!sameHost && !clientOrigins.includes(origin)) return next(forbidden('Cross-origin request blocked'));
  }
  if (req.auth) {
    const header = req.get('x-csrf-token');
    if (!header || header !== req.auth.csrfToken) return next(forbidden('Missing or invalid CSRF token'));
  }
  next();
}
