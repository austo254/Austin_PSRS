import { and, desc, eq, sql } from 'drizzle-orm';
import { db, type Tx, type Db } from '../../db/client.js';
import { notifications, users } from '../../db/schema.js';
import { notFound } from '../../utils/errors.js';

type Executor = Tx | Db;

export async function createNotification(
  executor: Executor,
  n: { userId: string; requestId?: string | null; title: string; message: string },
) {
  await executor.insert(notifications).values({ ...n, requestId: n.requestId ?? null });
}

export async function notifyAdmins(executor: Executor, n: { requestId: string; title: string; message: string }) {
  const admins = await executor.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN'));
  if (admins.length === 0) return;
  await executor.insert(notifications).values(admins.map((a) => ({ ...n, userId: a.id })));
}

export async function listNotifications(userId: string, opts: { unreadOnly?: boolean; limit?: number }) {
  const where = opts.unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    : eq(notifications.userId, userId);
  const [items, [{ count }]] = await Promise.all([
    db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(opts.limit ?? 50),
    db.select({ count: sql<number>`count(*)::int` }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
  ]);
  return { items, unreadCount: count };
}

export async function markRead(userId: string, id: string) {
  const rows = await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId))).returning({ id: notifications.id });
  if (rows.length === 0) throw notFound('Notification not found'); // also covers other users' notifications
}

export async function markAllRead(userId: string) {
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}
