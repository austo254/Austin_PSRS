import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { serviceCategories, serviceRequests } from '../../db/schema.js';

const OPEN = sql`${serviceRequests.status} in ('PENDING','IN_PROGRESS','REOPENED')`;

/**
 * Definitions (also documented in README):
 *  - resolutionRate  = RESOLVED / (all requests - REJECTED), as a percentage; 0 when the denominator is 0.
 *  - avgResolutionHours = mean(resolved_at - submitted_at) over currently RESOLVED requests; null when none.
 *  - avgOpenAgeDays  = mean(now - submitted_at) over open (PENDING, IN_PROGRESS, REOPENED) requests; null when none.
 */
export async function overview() {
  const [row] = await db.select({
    total: sql<number>`count(*)::int`,
    pending: sql<number>`count(*) filter (where ${serviceRequests.status} in ('PENDING','REOPENED'))::int`,
    inProgress: sql<number>`count(*) filter (where ${serviceRequests.status} = 'IN_PROGRESS')::int`,
    resolved: sql<number>`count(*) filter (where ${serviceRequests.status} = 'RESOLVED')::int`,
    rejected: sql<number>`count(*) filter (where ${serviceRequests.status} = 'REJECTED')::int`,
    avgResolutionHours: sql<number | null>`avg(extract(epoch from (${serviceRequests.resolvedAt} - ${serviceRequests.submittedAt})) / 3600) filter (where ${serviceRequests.status} = 'RESOLVED' and ${serviceRequests.resolvedAt} is not null)`,
    avgOpenAgeDays: sql<number | null>`avg(extract(epoch from (now() - ${serviceRequests.submittedAt})) / 86400) filter (where ${OPEN})`,
  }).from(serviceRequests);
  const denominator = row.total - row.rejected;
  const num = (v: unknown) => (v === null || v === undefined ? null : Math.round(Number(v) * 10) / 10);
  return {
    total: row.total, pending: row.pending, inProgress: row.inProgress, resolved: row.resolved, rejected: row.rejected,
    resolutionRate: denominator > 0 ? Math.round((row.resolved / denominator) * 1000) / 10 : 0,
    avgResolutionHours: num(row.avgResolutionHours),
    avgOpenAgeDays: num(row.avgOpenAgeDays),
  };
}

export async function byCategory() {
  return db.select({
    categoryId: serviceCategories.id, name: serviceCategories.name, count: sql<number>`count(${serviceRequests.id})::int`,
  }).from(serviceCategories).leftJoin(serviceRequests, eq(serviceRequests.categoryId, serviceCategories.id))
    .groupBy(serviceCategories.id, serviceCategories.name).orderBy(sql`count(${serviceRequests.id}) desc`, serviceCategories.name);
}

export async function byStatus() {
  const o = await overview();
  return [
    { status: 'PENDING', count: o.pending }, { status: 'IN_PROGRESS', count: o.inProgress },
    { status: 'RESOLVED', count: o.resolved }, { status: 'REJECTED', count: o.rejected },
  ];
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Daily submissions (last `days` days, gaps filled with 0) and monthly submitted-vs-resolved (last 12 months). */
export async function trends(days = 30) {
  const since = new Date(); since.setUTCHours(0, 0, 0, 0); since.setUTCDate(since.getUTCDate() - (days - 1));
  const daily = await db.execute<{ d: string; n: number }>(sql`
    select to_char(date_trunc('day', submitted_at at time zone 'UTC'), 'YYYY-MM-DD') as d, count(*)::int as n
    from service_requests where submitted_at >= ${since.toISOString()} group by 1`);
  const dailyMap = new Map(daily.rows.map((r) => [r.d, r.n]));
  const submittedOverTime = Array.from({ length: days }, (_, i) => {
    const d = new Date(since); d.setUTCDate(since.getUTCDate() + i);
    return { date: dayKey(d), count: dailyMap.get(dayKey(d)) ?? 0 };
  });

  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0); monthStart.setUTCMonth(monthStart.getUTCMonth() - 11);
  const sub = await db.execute<{ m: string; n: number }>(sql`
    select to_char(date_trunc('month', submitted_at at time zone 'UTC'), 'YYYY-MM') as m, count(*)::int as n
    from service_requests where submitted_at >= ${monthStart.toISOString()} group by 1`);
  const res = await db.execute<{ m: string; n: number }>(sql`
    select to_char(date_trunc('month', resolved_at at time zone 'UTC'), 'YYYY-MM') as m, count(*)::int as n
    from service_requests where resolved_at is not null and status = 'RESOLVED' and resolved_at >= ${monthStart.toISOString()} group by 1`);
  const sMap = new Map(sub.rows.map((r) => [r.m, r.n])); const rMap = new Map(res.rows.map((r) => [r.m, r.n]));
  const monthlyResolution = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(monthStart); d.setUTCMonth(monthStart.getUTCMonth() + i);
    const key = d.toISOString().slice(0, 7);
    return { month: key, submitted: sMap.get(key) ?? 0, resolved: rMap.get(key) ?? 0 };
  });
  return { submittedOverTime, monthlyResolution };
}
