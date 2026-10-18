import { Router, type Response } from 'express';
import { env, isProd } from '../../config/env.js';
import { wrap, parse } from '../../utils/async.js';
import { AppError } from '../../utils/errors.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  forgotSchema, loginSchema, profileSchema, registerSchema, resetSchema,
} from './auth.schemas.js';
import {
  createResetToken, registerCitizen, resetPassword, toPublicUser, updateProfile, verifyCredentials,
} from './auth.service.js';
import { createSession, destroySession, SESSION_COOKIE } from './session.service.js';

export const authRouter = Router();

function setSessionCookie(res: Response, s: { token: string; expiresAt: Date; remember: boolean }) {
  res.cookie(SESSION_COOKIE, s.token, {
    httpOnly: true,
    secure: isProd || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
    // "Remember me" => persistent cookie; otherwise a browser-session cookie (server-side expiry still applies).
    ...(s.remember ? { expires: s.expiresAt } : {}),
  });
}

authRouter.post('/register', authLimiter, wrap(async (req, res) => {
  const input = parse(registerSchema, req.body);
  const user = await registerCitizen(input);
  const session = await createSession(user.id, false);
  setSessionCookie(res, session);
  res.status(201).json({ user: toPublicUser(user), csrfToken: session.csrfToken });
}));

authRouter.post('/login', authLimiter, wrap(async (req, res) => {
  const { email, password, remember } = parse(loginSchema, req.body);
  const user = await verifyCredentials(email, password);
  const session = await createSession(user.id, !!remember);
  setSessionCookie(res, session);
  res.json({ user: toPublicUser(user), csrfToken: session.csrfToken });
}));

authRouter.post('/logout', wrap(async (req, res) => {
  if (req.auth) await destroySession(req.auth.sessionToken);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(204).end();
}));

authRouter.get('/me', requireAuth, wrap(async (req, res) => {
  res.json({ user: toPublicUser(req.auth!.user), csrfToken: req.auth!.csrfToken });
}));

authRouter.patch('/me', requireAuth, wrap(async (req, res) => {
  const patch = parse(profileSchema, req.body);
  const user = await updateProfile(req.auth!.user.id, patch);
  res.json({ user: toPublicUser(user) });
}));

// ---- Password reset ----
// No email provider is integrated, so "disabled" (default) answers honestly with 501.
// "demo" returns the one-time token in the response for classroom demonstrations; never allowed in production.
authRouter.post('/forgot-password', authLimiter, wrap(async (req, res) => {
  if (env.PASSWORD_RESET_MODE === 'disabled' || isProd) {
    throw new AppError(501, 'NOT_CONFIGURED', 'Password reset by email is not configured for this deployment. Please contact an administrator.');
  }
  const { email } = parse(forgotSchema, req.body);
  const token = await createResetToken(email);
  res.json({ message: 'If that account exists, a reset token has been generated (demo mode).', demoToken: token ?? undefined });
}));

authRouter.post('/reset-password', authLimiter, wrap(async (req, res) => {
  if (env.PASSWORD_RESET_MODE === 'disabled' || isProd) {
    throw new AppError(501, 'NOT_CONFIGURED', 'Password reset by email is not configured for this deployment.');
  }
  const { token, password } = parse(resetSchema, req.body);
  await resetPassword(token, password);
  res.json({ message: 'Password updated. You can now sign in.' });
}));
