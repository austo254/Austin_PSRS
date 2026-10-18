import { eq } from 'drizzle-orm';
import type { Tx } from '../../db/client.js';
import { requestStatusHistory, serviceRequests } from '../../db/schema.js';
import { ADMIN_TRANSITIONS, REOPEN_WINDOW_DAYS, STATUS_LABELS, type RequestStatus } from '../../constants.js';
import { badRequest, forbidden, notFound } from '../../utils/errors.js';
import { createNotification, notifyAdmins } from '../notifications/notification.service.js';
import { recordAudit } from '../audit/audit.service.js';

interface TransitionArgs {
  requestId: string;
  to: RequestStatus;
  actorId: string;
  actorRole: 'ADMIN' | 'CITIZEN';
  comment?: string;
  /** Required when moving to RESOLVED. */
  resolutionComment?: string;
}

/**
 * The only code path that changes a request's status. Must run inside a transaction so the status,
 * history row, notification and audit event commit together or not at all.
 * The request row is locked (FOR UPDATE) so concurrent admins cannot both apply conflicting transitions.
 */
export async function transitionStatus(tx: Tx, a: TransitionArgs) {
  const [req] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, a.requestId)).for('update');
  if (!req) throw notFound('Request not found');
  const from = req.status as RequestStatus;

  if (a.actorRole === 'CITIZEN') {
    if (req.citizenId !== a.actorId) throw notFound('Request not found');
    if (from !== 'RESOLVED' || a.to !== 'REOPENED') throw forbidden('Citizens can only reopen a resolved request');
    const windowMs = REOPEN_WINDOW_DAYS * 86_400_000;
    if (!req.resolvedAt || Date.now() - req.resolvedAt.getTime() > windowMs) {
      throw badRequest(`Requests can only be reopened within ${REOPEN_WINDOW_DAYS} days of resolution`);
    }
    if (!a.comment?.trim()) throw badRequest('Please explain why the request needs another look');
  } else if (!ADMIN_TRANSITIONS[from].includes(a.to)) {
    throw badRequest(`Cannot change status from ${STATUS_LABELS[from]} to ${STATUS_LABELS[a.to]}`);
  }

  if (a.to === 'RESOLVED' && !a.resolutionComment?.trim()) {
    throw badRequest('A resolution comment is required when resolving a request', { resolutionComment: 'Required' });
  }

  const now = new Date();
  const [updated] = await tx.update(serviceRequests).set({
    status: a.to,
    updatedAt: now,
    resolvedAt: a.to === 'RESOLVED' ? now : a.to === 'REOPENED' ? null : req.resolvedAt,
    resolutionComment: a.to === 'RESOLVED' ? a.resolutionComment!.trim() : req.resolutionComment,
  }).where(eq(serviceRequests.id, req.id)).returning();

  await tx.insert(requestStatusHistory).values({
    requestId: req.id, previousStatus: from, newStatus: a.to, changedById: a.actorId,
    comment: (a.to === 'RESOLVED' ? a.resolutionComment : a.comment)?.trim() || null,
  });

  if (a.actorRole === 'ADMIN') {
    const titles: Partial<Record<RequestStatus, string>> = {
      IN_PROGRESS: 'Work has started on your request',
      RESOLVED: 'Your request has been resolved',
      REJECTED: 'Your request was closed',
    };
    await createNotification(tx, {
      userId: req.citizenId, requestId: req.id,
      title: titles[a.to] ?? `Status changed to ${STATUS_LABELS[a.to]}`,
      message: `${req.trackingReference}: status changed from ${STATUS_LABELS[from]} to ${STATUS_LABELS[a.to]}.`,
    });
  } else {
    await notifyAdmins(tx, {
      requestId: req.id, title: 'Resolved request reopened',
      message: `${req.trackingReference} was reopened by the citizen and needs review.`,
    });
    await createNotification(tx, {
      userId: req.citizenId, requestId: req.id, title: 'Request reopened',
      message: `${req.trackingReference} has been reopened and is awaiting review.`,
    });
  }

  await recordAudit(tx, {
    actorId: a.actorId, action: a.to === 'REOPENED' ? 'request.reopened' : 'request.status_changed',
    entityType: 'request', entityId: req.id, metadata: { from, to: a.to, trackingReference: req.trackingReference },
  });
  return updated;
}
