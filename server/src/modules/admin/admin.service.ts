import { and, eq } from 'drizzle-orm';
import { stringify } from 'csv-stringify/sync';
import { db } from '../../db/client.js';
import { departments, requestComments, serviceCategories, serviceRequests, users } from '../../db/schema.js';
import { badRequest, notFound } from '../../utils/errors.js';
import type { Priority, RequestStatus } from '../../constants.js';
import { createNotification } from '../notifications/notification.service.js';
import { listAuditForEntity, recordAudit } from '../audit/audit.service.js';
import { getComments, getHistory } from './../requests/request.service.js';
import { citizenUsers, queryRequests, staffUsers, type ListQuery } from '../requests/request.query.js';
import { transitionStatus } from '../requests/workflow.service.js';

export async function getAdminRequestDetail(id: string) {
  const [row] = await db.select({
    request: serviceRequests, categoryName: serviceCategories.name, departmentName: departments.name,
    citizenName: citizenUsers.fullName, citizenEmail: citizenUsers.email, citizenPhone: citizenUsers.phoneNumber,
    staffName: staffUsers.fullName,
  }).from(serviceRequests)
    .innerJoin(serviceCategories, eq(serviceCategories.id, serviceRequests.categoryId))
    .innerJoin(citizenUsers, eq(citizenUsers.id, serviceRequests.citizenId))
    .leftJoin(departments, eq(departments.id, serviceRequests.assignedDepartmentId))
    .leftJoin(staffUsers, eq(staffUsers.id, serviceRequests.assignedStaffId))
    .where(eq(serviceRequests.id, id)).limit(1);
  if (!row) throw notFound('Request not found');
  const [history, comments, audit] = await Promise.all([getHistory(id), getComments(id, true), listAuditForEntity('request', id)]);
  return { ...row.request, categoryName: row.categoryName, departmentName: row.departmentName, staffName: row.staffName,
    citizen: { name: row.citizenName, email: row.citizenEmail, phone: row.citizenPhone }, history, comments, audit };
}

export function changeRequestStatus(requestId: string, adminId: string, to: RequestStatus, comment?: string, resolutionComment?: string) {
  return db.transaction((tx) => transitionStatus(tx, { requestId, to, actorId: adminId, actorRole: 'ADMIN', comment, resolutionComment }));
}

export async function assignRequest(
  requestId: string, adminId: string,
  patch: { departmentId?: string | null; staffId?: string | null; priority?: Priority },
) {
  return db.transaction(async (tx) => {
    const [req] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).for('update');
    if (!req) throw notFound('Request not found');

    const set: Partial<typeof serviceRequests.$inferInsert> = { updatedAt: new Date() };
    const meta: Record<string, unknown> = { trackingReference: req.trackingReference };
    let departmentName: string | null = null;

    if (patch.departmentId !== undefined) {
      if (patch.departmentId) {
        const [dept] = await tx.select().from(departments).where(and(eq(departments.id, patch.departmentId), eq(departments.isActive, true))).limit(1);
        if (!dept) throw badRequest('Choose an active department', { departmentId: 'Invalid department' });
        departmentName = dept.name;
      }
      set.assignedDepartmentId = patch.departmentId; meta.departmentId = patch.departmentId;
    }
    if (patch.staffId !== undefined) {
      if (patch.staffId) {
        const [staff] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, patch.staffId), eq(users.role, 'ADMIN'))).limit(1);
        if (!staff) throw badRequest('Staff member must be an administrator account', { staffId: 'Invalid staff member' });
      }
      set.assignedStaffId = patch.staffId; meta.staffId = patch.staffId;
    }
    if (patch.priority) { set.priority = patch.priority; meta.priority = patch.priority; }
    if (Object.keys(meta).length === 1) throw badRequest('Nothing to update');

    const [updated] = await tx.update(serviceRequests).set(set).where(eq(serviceRequests.id, requestId)).returning();
    if (departmentName && patch.departmentId !== req.assignedDepartmentId) {
      await createNotification(tx, {
        userId: req.citizenId, requestId, title: 'Request assigned',
        message: `${req.trackingReference} was assigned to ${departmentName}.`,
      });
    }
    await recordAudit(tx, { actorId: adminId, action: 'request.assignment_changed', entityType: 'request', entityId: requestId, metadata: meta });
    return updated;
  });
}

/** PUBLIC notes are citizen-visible updates (and notify the citizen); INTERNAL notes are staff-only. */
export async function addAdminNote(requestId: string, adminId: string, body: string, visibility: 'PUBLIC' | 'INTERNAL') {
  return db.transaction(async (tx) => {
    const [req] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).for('update');
    if (!req) throw notFound('Request not found');
    const [note] = await tx.insert(requestComments).values({ requestId, authorId: adminId, body, visibility }).returning();
    await tx.update(serviceRequests).set({ updatedAt: new Date() }).where(eq(serviceRequests.id, requestId));
    if (visibility === 'PUBLIC') {
      await createNotification(tx, {
        userId: req.citizenId, requestId, title: 'New update on your request', message: `${req.trackingReference}: ${body.slice(0, 140)}`,
      });
    }
    await recordAudit(tx, { actorId: adminId, action: visibility === 'PUBLIC' ? 'request.public_comment' : 'request.internal_note', entityType: 'request', entityId: requestId });
    return note;
  });
}

export const listStaff = () => db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.role, 'ADMIN'));

// Spreadsheet apps execute cells starting with = + - @ as formulas; neutralise them (CSV injection).
const safeCell = (v: unknown) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export async function exportRequestsCsv(q: ListQuery) {
  const all: any[] = [];
  for (let page = 1; page <= 100; page++) {
    const res = await queryRequests({ ...q, page, pageSize: 100 }, { admin: true });
    all.push(...res.items);
    if (page >= res.totalPages) break;
  }
  const header = ['Tracking Reference', 'Title', 'Citizen', 'Citizen Email', 'Category', 'Location', 'Status', 'Priority', 'Department', 'Assigned Staff', 'Submitted At', 'Updated At', 'Resolved At'];
  const rows = all.map((r) => [
    r.trackingReference, r.title, r.citizenName, r.citizenEmail, r.categoryName, r.location, r.status, r.priority,
    r.departmentName ?? '', r.staffName ?? '', r.submittedAt.toISOString(), r.updatedAt.toISOString(), r.resolvedAt?.toISOString() ?? '',
  ].map(safeCell));
  return stringify([header, ...rows]);
}
