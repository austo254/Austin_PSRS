import { desc, eq, and } from 'drizzle-orm';
import { db, type Tx, type Db } from '../../db/client.js';
import { auditLogs, users } from '../../db/schema.js';

type Executor = Tx | Db;

/** Writes an audit event. Pass the active transaction so the event commits (or rolls back) with the change itself. */
export async function recordAudit(
  executor: Executor,
  e: { actorId: string | null; action: string; entityType: string; entityId: string; metadata?: Record<string, unknown> },
) {
  await executor.insert(auditLogs).values({ ...e, metadata: e.metadata ?? null });
}

export async function listAuditForEntity(entityType: string, entityId: string, limit = 50) {
  return db
    .select({
      id: auditLogs.id, action: auditLogs.action, metadata: auditLogs.metadata, createdAt: auditLogs.createdAt,
      actorName: users.fullName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
