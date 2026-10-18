import argon2 from 'argon2';
import crypto from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { passwordResetTokens, users, type User } from '../../db/schema.js';
import { badRequest, conflict, unauthorized } from '../../utils/errors.js';
import { destroyUserSessions } from './session.service.js';
import { recordAudit } from '../audit/audit.service.js';

// Argon2id with OWASP-recommended minimums (19 MiB, t=2, p=1).
const ARGON_OPTS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;
export const hashPassword = (pw: string) => argon2.hash(pw, ARGON_OPTS);
// Pre-computed hash so unknown-email logins take about as long as real ones (prevents user enumeration by timing).
const DUMMY_HASH = await argon2.hash('dummy-password-for-timing', ARGON_OPTS);

/** Public-safe user shape; never includes passwordHash. */
export const toPublicUser = (u: User) => ({
  id: u.id, fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber, role: u.role, createdAt: u.createdAt,
});

export async function registerCitizen(input: { fullName: string; email: string; phoneNumber?: string; password: string }) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) throw conflict('An account with this email already exists');
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db.insert(users).values({
      fullName: input.fullName, email: input.email, phoneNumber: input.phoneNumber ?? null, passwordHash, role: 'CITIZEN',
    }).returning();
    return user;
  } catch (e: any) {
    if (e?.code === '23505' || e?.cause?.code === '23505') throw conflict('An account with this email already exists');
    throw e;
  }
}

export async function verifyCredentials(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const ok = await argon2.verify(user?.passwordHash ?? DUMMY_HASH, password).catch(() => false);
  if (!user || !ok) throw unauthorized('Incorrect email or password'); // generic on purpose
  return user;
}

export async function updateProfile(userId: string, patch: { fullName?: string; phoneNumber?: string | null }) {
  const [user] = await db.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
  return user;
}

/** Demo-mode reset: returns the token directly because no email provider is integrated. Disabled in production. */
export async function createResetToken(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return null; // caller responds identically either way
  const token = crypto.randomBytes(32).toString('base64url');
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 30 * 60_000),
  });
  return token;
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(passwordResetTokens).where(and(
      eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()),
    )).limit(1);
    if (!row) throw badRequest('This reset link is invalid or has expired');
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
    await recordAudit(tx, { actorId: row.userId, action: 'auth.password_reset', entityType: 'user', entityId: row.userId });
  });
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1);
  if (row) await destroyUserSessions(row.userId); // sign out everywhere after a reset
}
