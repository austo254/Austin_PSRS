import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  departments, requestComments, requestStatusHistory, serviceCategories, serviceRequests, users, type ServiceRequest,
} from '../../db/schema.js';
import { badRequest, conflict, notFound } from '../../utils/errors.js';
import { createNotification, notifyAdmins } from '../notifications/notification.service.js';
import { recordAudit } from '../audit/audit.service.js';
import { transitionStatus } from './workflow.service.js';

export interface CreateRequestInput {
  title: string; categoryId: string; location: string; description: string; latitude?: string; longitude?: string;
}

export async function createRequest(citizenId: string, input: CreateRequestInput, imageUrl: string | null) {
  const [category] = await db.select().from(serviceCategories)
    .where(and(eq(serviceCategories.id, input.categoryId), eq(serviceCategories.isActive, true))).limit(1);
  if (!category) throw badRequest('Choose a valid service category', { categoryId: 'Invalid category' });

  // Guard against accidental double submits (repeated clicks / retries) from the same citizen.
  const [dup] = await db.select({ id: serviceRequests.id, ref: serviceRequests.trackingReference }).from(serviceRequests)
    .where(and(
      eq(serviceRequests.citizenId, citizenId), eq(serviceRequests.title, input.title), eq(serviceRequests.description, input.description),
      sql`${serviceRequests.submittedAt} > now() - interval '60 seconds'`,
    )).limit(1);
  if (dup) throw conflict(`This request was already submitted as ${dup.ref}`);

  return db.transaction(async (tx) => {
    // Postgres sequence => unique, gap-tolerant, safe under concurrent inserts.
    const { rows } = await tx.execute<{ n: string }>(sql`select nextval('request_tracking_seq') as n`);
    const ref = `PSRS-${new Date().getUTCFullYear()}-${String(rows[0].n).padStart(6, '0')}`;
    const [created] = await tx.insert(serviceRequests).values({
      trackingReference: ref, citizenId, categoryId: input.categoryId, title: input.title, description: input.description,
      location: input.location, latitude: input.latitude ?? null, longitude: input.longitude ?? null, imageUrl, status: 'PENDING',
    }).returning();
    await tx.insert(requestStatusHistory).values({
      requestId: created.id, previousStatus: null, newStatus: 'PENDING', changedById: citizenId, comment: 'Request submitted',
    });
    await createNotification(tx, {
      userId: citizenId, requestId: created.id, title: 'Request submitted',
      message: `Your request ${ref} was received and is awaiting review.`,
    });
    await notifyAdmins(tx, { requestId: created.id, title: 'New service request', message: `${ref}: ${created.title}` });
    await recordAudit(tx, { actorId: citizenId, action: 'request.created', entityType: 'request', entityId: created.id, metadata: { trackingReference: ref } });
    return created;
  });
}

/** Fetches a request only if it belongs to the citizen; otherwise behaves as not-found (prevents ID probing). */
export async function getOwnedRequest(citizenId: string, id: string) {
  const [row] = await db.select({
    request: serviceRequests, categoryName: serviceCategories.name, departmentName: departments.name,
  }).from(serviceRequests)
    .innerJoin(serviceCategories, eq(serviceCategories.id, serviceRequests.categoryId))
    .leftJoin(departments, eq(departments.id, serviceRequests.assignedDepartmentId))
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.citizenId, citizenId))).limit(1);
  if (!row) throw notFound('Request not found');
  return row;
}

/** Citizen-safe projection: no staff identity, no internal notes. */
export function toCitizenRequest(row: Awaited<ReturnType<typeof getOwnedRequest>>) {
  const r: ServiceRequest = row.request;
  return {
    id: r.id, trackingReference: r.trackingReference, title: r.title, description: r.description, location: r.location,
    latitude: r.latitude, longitude: r.longitude, imageUrl: r.imageUrl, status: r.status, priority: r.priority,
    resolutionComment: r.resolutionComment, submittedAt: r.submittedAt, updatedAt: r.updatedAt, resolvedAt: r.resolvedAt,
    categoryId: r.categoryId, categoryName: row.categoryName, departmentName: row.departmentName,
    canEdit: r.status === 'PENDING',
  };
}

export async function updateOwnedRequest(citizenId: string, id: string, patch: { title?: string; location?: string; description?: string }) {
  const { request } = await getOwnedRequest(citizenId, id);
  if (request.status !== 'PENDING') throw badRequest('Only pending requests can be edited');
  if (Object.keys(patch).length === 0) throw badRequest('Nothing to update');
  await db.transaction(async (tx) => {
    await tx.update(serviceRequests).set({ ...patch, updatedAt: new Date() }).where(eq(serviceRequests.id, id));
    await recordAudit(tx, { actorId: citizenId, action: 'request.edited_by_citizen', entityType: 'request', entityId: id, metadata: { fields: Object.keys(patch) } });
  });
}

export async function getHistory(requestId: string) {
  return db.select({
    id: requestStatusHistory.id, previousStatus: requestStatusHistory.previousStatus, newStatus: requestStatusHistory.newStatus,
    comment: requestStatusHistory.comment, createdAt: requestStatusHistory.createdAt,
    changedByName: users.fullName, changedByRole: users.role,
  }).from(requestStatusHistory).innerJoin(users, eq(users.id, requestStatusHistory.changedById))
    .where(eq(requestStatusHistory.requestId, requestId)).orderBy(asc(requestStatusHistory.createdAt));
}

export async function getComments(requestId: string, includeInternal: boolean) {
  return db.select({
    id: requestComments.id, body: requestComments.body, visibility: requestComments.visibility, createdAt: requestComments.createdAt,
    authorName: users.fullName, authorRole: users.role,
  }).from(requestComments).innerJoin(users, eq(users.id, requestComments.authorId))
    .where(includeInternal ? eq(requestComments.requestId, requestId)
      : and(eq(requestComments.requestId, requestId), eq(requestComments.visibility, 'PUBLIC')))
    .orderBy(asc(requestComments.createdAt));
}

export async function addCitizenComment(citizenId: string, requestId: string, body: string) {
  const { request } = await getOwnedRequest(citizenId, requestId);
  await db.transaction(async (tx) => {
    await tx.insert(requestComments).values({ requestId, authorId: citizenId, body, visibility: 'PUBLIC' }); // citizens can never post INTERNAL
    await tx.update(serviceRequests).set({ updatedAt: new Date() }).where(eq(serviceRequests.id, requestId));
    await notifyAdmins(tx, { requestId, title: 'Citizen added a comment', message: `${request.trackingReference} has a new citizen comment.` });
  });
}

export async function reopenRequest(citizenId: string, requestId: string, reason: string) {
  return db.transaction((tx) => transitionStatus(tx, { requestId, to: 'REOPENED', actorId: citizenId, actorRole: 'CITIZEN', comment: reason }));
}

/** Dashboard summary for the authenticated citizen only. */
export async function citizenSummary(citizenId: string) {
  const counts = await db.select({ status: serviceRequests.status, n: sql<number>`count(*)::int` })
    .from(serviceRequests).where(eq(serviceRequests.citizenId, citizenId)).groupBy(serviceRequests.status);
  const by = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number>;
  const total = counts.reduce((s, c) => s + c.n, 0);
  const activity = await db.select({
    id: requestStatusHistory.id, requestId: requestStatusHistory.requestId, trackingReference: serviceRequests.trackingReference,
    newStatus: requestStatusHistory.newStatus, comment: requestStatusHistory.comment, createdAt: requestStatusHistory.createdAt,
  }).from(requestStatusHistory).innerJoin(serviceRequests, eq(serviceRequests.id, requestStatusHistory.requestId))
    .where(eq(serviceRequests.citizenId, citizenId)).orderBy(desc(requestStatusHistory.createdAt)).limit(5);
  return {
    total, pending: (by.PENDING ?? 0) + (by.REOPENED ?? 0), inProgress: by.IN_PROGRESS ?? 0,
    resolved: by.RESOLVED ?? 0, rejected: by.REJECTED ?? 0, recentActivity: activity,
  };
}
