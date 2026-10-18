import crypto from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { sessions, users } from '../../db/schema.js';
import { env } from '../../config/env.js';

export const SESSION_COOKIE = 'psrs_sid';
const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export async function createSession(userId: string, remember: boolean) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ttlMs = remember ? env.SESSION_TTL_REMEMBER_DAYS * 86_400_000 : env.SESSION_TTL_HOURS * 3_600_000;
  const expiresAt = new Date(Date.now() + ttlMs);
  const csrfToken = crypto.randomBytes(24).toString('base64url');
  await db.insert(sessions).values({ id: sha256(token), userId, csrfToken, expiresAt });
  return { token, expiresAt, csrfToken, remember };
}

export async function findSession(token: string) {
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export const destroySession = (token: string) => db.delete(sessions).where(eq(sessions.id, sha256(token)));
export const destroyUserSessions = (userId: string) => db.delete(sessions).where(eq(sessions.userId, userId));
export const purgeExpiredSessions = () => db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
