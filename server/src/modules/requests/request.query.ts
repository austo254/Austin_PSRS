import { and, asc, desc, eq, gte, ilike, lt, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { PRIORITIES, REQUEST_STATUSES } from '../../constants.js';
import { departments, serviceCategories, serviceRequests, users } from '../../db/schema.js';
import { db } from '../../db/client.js';

export const staffUsers = alias(users, 'staff');
export const citizenUsers = alias(users, 'citizen_user');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(REQUEST_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  categoryId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  sortBy: z.enum(['submittedAt', 'updatedAt', 'status', 'title', 'trackingReference', 'priority']).default('submittedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Builds WHERE conditions. Citizen scope is always enforced by the caller via `citizenId`. */
export function buildFilters(q: ListQuery, opts: { citizenId?: string; searchCitizen?: boolean }): SQL | undefined {
  const c: (SQL | undefined)[] = [];
  if (opts.citizenId) c.push(eq(serviceRequests.citizenId, opts.citizenId));
  if (q.status) c.push(eq(serviceRequests.status, q.status));
  if (q.priority) c.push(eq(serviceRequests.priority, q.priority));
  if (q.categoryId) c.push(eq(serviceRequests.categoryId, q.categoryId));
  if (q.departmentId) c.push(eq(serviceRequests.assignedDepartmentId, q.departmentId));
  if (q.from) c.push(gte(serviceRequests.submittedAt, new Date(`${q.from}T00:00:00.000Z`)));
  if (q.to) { // inclusive end date
    const end = new Date(`${q.to}T00:00:00.000Z`); end.setUTCDate(end.getUTCDate() + 1);
    c.push(lt(serviceRequests.submittedAt, end));
  }
  if (q.q) {
    const like = `%${escapeLike(q.q)}%`;
    c.push(or(
      ilike(serviceRequests.title, like), ilike(serviceRequests.location, like), ilike(serviceRequests.trackingReference, like),
      ...(opts.searchCitizen ? [ilike(citizenUsers.fullName, like), ilike(citizenUsers.email, like)] : []),
    ));
  }
  return and(...c);
}

const sortColumn = {
  submittedAt: serviceRequests.submittedAt, updatedAt: serviceRequests.updatedAt, status: serviceRequests.status,
  title: serviceRequests.title, trackingReference: serviceRequests.trackingReference, priority: serviceRequests.priority,
} as const;

export const orderBy = (q: ListQuery) => [
  (q.sortDir === 'asc' ? asc : desc)(sortColumn[q.sortBy]),
  desc(serviceRequests.id), // stable tiebreaker so pagination never repeats/skips rows
];

export const listColumns = {
  id: serviceRequests.id,
  trackingReference: serviceRequests.trackingReference,
  title: serviceRequests.title,
  location: serviceRequests.location,
  status: serviceRequests.status,
  priority: serviceRequests.priority,
  submittedAt: serviceRequests.submittedAt,
  updatedAt: serviceRequests.updatedAt,
  resolvedAt: serviceRequests.resolvedAt,
  categoryId: serviceRequests.categoryId,
  categoryName: serviceCategories.name,
  departmentId: serviceRequests.assignedDepartmentId,
  departmentName: departments.name,
};

/** Shared paginated list used by both citizen ("my requests") and admin views. */
export async function queryRequests(q: ListQuery, opts: { citizenId?: string; admin?: boolean }) {
  const where = buildFilters(q, { citizenId: opts.citizenId, searchCitizen: opts.admin });
  const base = (cols: any) => db.select(cols).from(serviceRequests)
    .innerJoin(serviceCategories, eq(serviceCategories.id, serviceRequests.categoryId))
    .innerJoin(citizenUsers, eq(citizenUsers.id, serviceRequests.citizenId))
    .leftJoin(departments, eq(departments.id, serviceRequests.assignedDepartmentId))
    .leftJoin(staffUsers, eq(staffUsers.id, serviceRequests.assignedStaffId))
    .where(where);

  const [{ total }] = (await base({ total: sql<number>`count(*)::int` })) as unknown as { total: number }[];
  const cols = opts.admin
    ? { ...listColumns, citizenName: citizenUsers.fullName, citizenEmail: citizenUsers.email, staffId: serviceRequests.assignedStaffId, staffName: staffUsers.fullName }
    : listColumns;
  const items = await base(cols).orderBy(...orderBy(q)).limit(q.pageSize).offset((q.page - 1) * q.pageSize);
  return { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}
