import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { app, closeDb, login, registerCitizen, resetDb, seedBasics, validRequest } from './helpers.js';
import { db } from '../src/db/client.js';
import { auditLogs, notifications, requestStatusHistory, serviceRequests } from '../src/db/schema.js';
import { setStorage } from '../src/services/storage.js';

let ctx: Awaited<ReturnType<typeof seedBasics>>;
beforeAll(async () => { await resetDb(); ctx = await seedBasics(); });
afterAll(closeDb);

const submit = async (s: Awaited<ReturnType<typeof registerCitizen>>, over: Record<string, unknown> = {}) => {
  const res = await s.post('/api/v1/requests').send(validRequest(ctx.category.id, over));
  expect(res.status).toBe(201);
  return res.body as { id: string; trackingReference: string; status: string };
};

describe('request submission', () => {
  it('creates a PENDING request with a unique PSRS reference, history, and notification', async () => {
    const s = await registerCitizen('submit@test.dev');
    const a = await submit(s, { title: 'First pothole report' });
    const b = await submit(s, { title: 'Second pothole report' });
    expect(a.status).toBe('PENDING');
    expect(a.trackingReference).toMatch(/^PSRS-\d{4}-\d{6}$/);
    expect(b.trackingReference).not.toBe(a.trackingReference);
    const hist = await db.select().from(requestStatusHistory).where(eq(requestStatusHistory.requestId, a.id));
    expect(hist).toHaveLength(1);
    expect(hist[0]).toMatchObject({ previousStatus: null, newStatus: 'PENDING' });
    const n = await s.get('/api/v1/notifications');
    expect(n.body.items.some((x: any) => x.requestId === a.id && x.title === 'Request submitted')).toBe(true);
  });

  it('generates distinct references under concurrent submissions', async () => {
    const s = await registerCitizen('concurrent@test.dev');
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) =>
      s.post('/api/v1/requests').send(validRequest(ctx.category.id, { title: `Concurrent report number ${i}` }))));
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(new Set(results.map((r) => r.body.trackingReference)).size).toBe(8);
  });

  it('rejects missing/invalid fields with field-level messages', async () => {
    const s = await registerCitizen('invalid@test.dev');
    const res = await s.post('/api/v1/requests').send({ title: 'abc', categoryId: 'nope', location: '', description: 'short' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['title', 'categoryId', 'location', 'description']));
  });

  it('rejects an immediate duplicate submission', async () => {
    const s = await registerCitizen('dupe@test.dev');
    await submit(s, { title: 'Exactly the same title' });
    const again = await s.post('/api/v1/requests').send(validRequest(ctx.category.id, { title: 'Exactly the same title' }));
    expect(again.status).toBe(409);
  });

  it('ignores protected fields (mass assignment) sent by a citizen', async () => {
    const s = await registerCitizen('mass@test.dev');
    const r = await s.post('/api/v1/requests').send(validRequest(ctx.category.id, { title: 'Mass assignment attempt', status: 'RESOLVED', priority: 'URGENT', citizenId: ctx.admin.id }));
    expect(r.status).toBe(201);
    const [row] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, r.body.id));
    expect(row.status).toBe('PENDING');
    expect(row.priority).toBe('MEDIUM');
    expect(row.citizenId).not.toBe(ctx.admin.id);
  });
});

describe('image uploads', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const form = (s: Awaited<ReturnType<typeof registerCitizen>>, file: Buffer, filename: string, contentType: string, title: string) =>
    s.post('/api/v1/requests').field('title', title).field('categoryId', ctx.category.id).field('location', 'Somewhere in town')
      .field('description', 'Description that is comfortably long enough to pass validation.').attach('image', file, { filename, contentType });

  it('explains clearly when storage is not configured', async () => {
    setStorage(null);
    const s = await registerCitizen('noup@test.dev');
    const res = await form(s, png, 'a.png', 'image/png', 'Upload while disabled');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('UPLOADS_DISABLED');
  });

  it('accepts a real PNG and stores its URL; rejects disguised non-images by content', async () => {
    setStorage({ put: async (_b, ext) => `https://cdn.test/requests/x.${ext}` });
    const s = await registerCitizen('up@test.dev');
    const ok = await form(s, png, 'a.png', 'image/png', 'Upload a real image');
    expect(ok.status).toBe(201);
    const detail = await s.get(`/api/v1/requests/${ok.body.id}`);
    expect(detail.body.imageUrl).toBe('https://cdn.test/requests/x.png');
    const fake = await form(s, Buffer.from('<script>alert(1)</script>'), 'evil.png', 'image/png', 'Upload a disguised file');
    expect(fake.status).toBe(400);
    setStorage(null);
  });
});

describe('ownership and role isolation', () => {
  it("prevents a citizen from reading or changing another citizen's request", async () => {
    const alice = await registerCitizen('alice@test.dev');
    const mallory = await registerCitizen('mallory@test.dev');
    const r = await submit(alice, { title: "Alice's private request" });
    for (const url of [`/api/v1/requests/${r.id}`, `/api/v1/requests/${r.id}/history`, `/api/v1/requests/${r.id}/comments`]) {
      expect((await mallory.get(url)).status).toBe(404);
    }
    expect((await mallory.patch(`/api/v1/requests/${r.id}`).send({ title: 'Hijacked title here' })).status).toBe(404);
    expect((await mallory.post(`/api/v1/requests/${r.id}/comments`).send({ body: 'hi' })).status).toBe(404);
    const list = await mallory.get('/api/v1/requests');
    expect(list.body.total).toBe(0);
    expect((await alice.get(`/api/v1/requests/${r.id}`)).status).toBe(200);
  });

  it('blocks citizens from every admin endpoint', async () => {
    const c = await registerCitizen('notadmin@test.dev');
    for (const url of ['/api/v1/admin/requests', '/api/v1/admin/analytics/overview', '/api/v1/admin/requests/export', '/api/v1/admin/categories', '/api/v1/admin/departments']) {
      expect((await c.get(url)).status).toBe(403);
    }
    expect((await c.post('/api/v1/admin/categories').send({ name: 'Sneaky' })).status).toBe(403);
    expect((await c.patch('/api/v1/admin/requests/00000000-0000-4000-8000-000000000000/status').send({ status: 'RESOLVED' })).status).toBe(403);
  });

  it('does not let a citizen edit non-pending requests or send status fields', async () => {
    const c = await registerCitizen('editor@test.dev');
    const r = await submit(c, { title: 'Editable until reviewed' });
    expect((await c.patch(`/api/v1/requests/${r.id}`).send({ title: 'Updated pothole title' })).status).toBe(200);
    expect((await c.patch(`/api/v1/requests/${r.id}`).send({ status: 'RESOLVED' })).status).toBe(400); // strict schema
    const admin = await login('admin@test.dev');
    await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'IN_PROGRESS' });
    expect((await c.patch(`/api/v1/requests/${r.id}`).send({ title: 'Too late to edit now' })).status).toBe(400);
  });
});

describe('admin workflow', () => {
  let citizen: Awaited<ReturnType<typeof registerCitizen>>;
  let admin: Awaited<ReturnType<typeof login>>;
  beforeEach(async () => {
    citizen = await registerCitizen(`wf${Math.random().toString(36).slice(2, 8)}@test.dev`);
    admin = await login('admin@test.dev');
  });

  it('allows Pending -> In Progress -> Resolved and records history, notifications and audit', async () => {
    const r = await submit(citizen, { title: 'Workflow happy path request' });
    const p = await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'IN_PROGRESS', comment: 'Crew dispatched' });
    expect(p.status).toBe(200);
    expect(p.body.status).toBe('IN_PROGRESS');
    const res = await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'RESOLVED', resolutionComment: 'Pothole filled and compacted.' });
    expect(res.status).toBe(200);
    expect(res.body.resolvedAt).toBeTruthy();

    const hist = await citizen.get(`/api/v1/requests/${r.id}/history`);
    expect(hist.body.items.map((h: any) => h.newStatus)).toEqual(['PENDING', 'IN_PROGRESS', 'RESOLVED']);
    expect(hist.body.items[1]).toMatchObject({ previousStatus: 'PENDING', changedByRole: 'ADMIN' });

    const n = await citizen.get('/api/v1/notifications');
    const titles = n.body.items.filter((x: any) => x.requestId === r.id).map((x: any) => x.title);
    expect(titles).toEqual(expect.arrayContaining(['Work has started on your request', 'Your request has been resolved']));

    const audit = await db.select().from(auditLogs).where(eq(auditLogs.entityId, r.id));
    expect(audit.filter((a) => a.action === 'request.status_changed')).toHaveLength(2);
  });

  it('rejects invalid transitions', async () => {
    const r = await submit(citizen, { title: 'Invalid transition request' });
    expect((await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'RESOLVED', resolutionComment: 'skip ahead' })).status).toBe(400); // Pending -> Resolved
    expect((await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'PENDING' })).status).toBe(400);
    await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'REJECTED', comment: 'Out of scope' });
    expect((await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'IN_PROGRESS' })).status).toBe(400); // terminal
  });

  it('requires a resolution comment to resolve', async () => {
    const r = await submit(citizen, { title: 'Needs resolution comment' });
    await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'IN_PROGRESS' });
    const res = await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'RESOLVED' });
    expect(res.status).toBe(400);
    expect((await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'RESOLVED', resolutionComment: '   ' })).status).toBe(400);
    const [row] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, r.id));
    expect(row.status).toBe('IN_PROGRESS');
  });

  it('rolls back everything when a transition fails (no partial history/notification)', async () => {
    const r = await submit(citizen, { title: 'Atomicity check request' });
    const before = await db.select().from(requestStatusHistory).where(eq(requestStatusHistory.requestId, r.id));
    await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'RESOLVED', resolutionComment: 'nope' });
    const after = await db.select().from(requestStatusHistory).where(eq(requestStatusHistory.requestId, r.id));
    expect(after).toHaveLength(before.length);
  });

  it('assigns department and priority, notifying the citizen and auditing', async () => {
    const r = await submit(citizen, { title: 'Assignment test request' });
    const res = await admin.patch(`/api/v1/admin/requests/${r.id}/assignment`).send({ departmentId: ctx.department.id, staffId: ctx.admin.id, priority: 'URGENT' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ departmentName: 'Roads and Transport', priority: 'URGENT', staffName: 'Test Admin' });
    const n = await db.select().from(notifications).where(eq(notifications.requestId, r.id));
    expect(n.some((x) => x.title === 'Request assigned')).toBe(true);
    const audit = await db.select().from(auditLogs).where(eq(auditLogs.entityId, r.id));
    expect(audit.some((a) => a.action === 'request.assignment_changed')).toBe(true);
    expect((await admin.patch(`/api/v1/admin/requests/${r.id}/assignment`).send({ staffId: citizen.user.id })).status).toBe(400); // citizens can't be staff
  });

  it('keeps internal notes hidden from citizens while public updates notify them', async () => {
    const r = await submit(citizen, { title: 'Notes visibility request' });
    await admin.post(`/api/v1/admin/requests/${r.id}/notes`).send({ body: 'SECRET internal triage thoughts', visibility: 'INTERNAL' });
    await admin.post(`/api/v1/admin/requests/${r.id}/notes`).send({ body: 'We have scheduled an inspection.', visibility: 'PUBLIC' });
    const seen = await citizen.get(`/api/v1/requests/${r.id}/comments`);
    expect(seen.body.items.map((c: any) => c.body)).toEqual(['We have scheduled an inspection.']);
    expect(JSON.stringify((await citizen.get(`/api/v1/requests/${r.id}`)).body)).not.toContain('SECRET');
    const detail = await admin.get(`/api/v1/admin/requests/${r.id}`);
    expect(detail.body.comments).toHaveLength(2);
    const n = await db.select().from(notifications).where(eq(notifications.requestId, r.id));
    expect(n.some((x) => x.title === 'New update on your request')).toBe(true);
    expect(n.some((x) => x.message.includes('SECRET'))).toBe(false);
  });

  it('lets a citizen reopen a resolved request, and only that', async () => {
    const r = await submit(citizen, { title: 'Reopen flow request' });
    expect((await citizen.post(`/api/v1/requests/${r.id}/reopen`).send({ reason: 'not resolved yet' })).status).toBe(403);
    await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'IN_PROGRESS' });
    await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'RESOLVED', resolutionComment: 'Fixed it.' });
    const res = await citizen.post(`/api/v1/requests/${r.id}/reopen`).send({ reason: 'The hole is back after rain' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REOPENED');
    expect((await admin.patch(`/api/v1/admin/requests/${r.id}/status`).send({ status: 'IN_PROGRESS' })).status).toBe(200);
  });
});

describe('notifications', () => {
  it('lists, counts, marks one and all as read, and isolates users', async () => {
    const a = await registerCitizen('notifa@test.dev');
    const b = await registerCitizen('notifb@test.dev');
    await submit(a, { title: 'Notification test one' });
    await submit(a, { title: 'Notification test two' });
    const list = await a.get('/api/v1/notifications');
    expect(list.body.unreadCount).toBe(2);
    expect((await b.patch(`/api/v1/notifications/${list.body.items[0].id}/read`)).status).toBe(404);
    expect((await a.patch(`/api/v1/notifications/${list.body.items[0].id}/read`)).status).toBe(204);
    expect((await a.get('/api/v1/notifications')).body.unreadCount).toBe(1);
    await a.post('/api/v1/notifications/read-all');
    expect((await a.get('/api/v1/notifications')).body.unreadCount).toBe(0);
  });
});

describe('dashboards, filtering, pagination, export', () => {
  it('citizen summary only counts own requests', async () => {
    const c = await registerCitizen('summary@test.dev');
    const other = await registerCitizen('summary-other@test.dev');
    await submit(other, { title: 'Someone elses request' });
    const r1 = await submit(c, { title: 'Summary request one' });
    await submit(c, { title: 'Summary request two' });
    const admin = await login('admin@test.dev');
    await admin.patch(`/api/v1/admin/requests/${r1.id}/status`).send({ status: 'IN_PROGRESS' });
    const s = await c.get('/api/v1/requests/summary');
    expect(s.body).toMatchObject({ total: 2, pending: 1, inProgress: 1, resolved: 0 });
  });

  it('admin overview matches database state and handles definitions', async () => {
    const admin = await login('admin@test.dev');
    const o = (await admin.get('/api/v1/admin/analytics/overview')).body;
    const rows = await db.select().from(serviceRequests);
    expect(o.total).toBe(rows.length);
    expect(o.pending).toBe(rows.filter((r) => ['PENDING', 'REOPENED'].includes(r.status)).length);
    expect(o.resolved).toBe(rows.filter((r) => r.status === 'RESOLVED').length);
    const denom = rows.filter((r) => r.status !== 'REJECTED').length;
    expect(o.resolutionRate).toBeCloseTo((o.resolved / denom) * 100, 0);
    expect(typeof o.avgResolutionHours === 'number' || o.avgResolutionHours === null).toBe(true);
  });

  it('analytics endpoints return gap-filled series and per-category totals matching the database', async () => {
    const admin = await login('admin@test.dev');
    const t = (await admin.get('/api/v1/admin/analytics/trends?days=14')).body;
    expect(t.submittedOverTime).toHaveLength(14);
    expect(t.monthlyResolution).toHaveLength(12);
    const cat = (await admin.get('/api/v1/admin/analytics/by-category')).body.items;
    expect(cat.reduce((n: number, c: any) => n + c.count, 0)).toBe((await db.select().from(serviceRequests)).length);
  });

  it('filters, searches, sorts and paginates on the server', async () => {
    const admin = await login('admin@test.dev');
    const total = (await db.select().from(serviceRequests)).length;
    const page1 = (await admin.get('/api/v1/admin/requests?pageSize=5&page=1&sortBy=submittedAt&sortDir=asc')).body;
    const page2 = (await admin.get('/api/v1/admin/requests?pageSize=5&page=2&sortBy=submittedAt&sortDir=asc')).body;
    expect(page1.total).toBe(total);
    expect(page1.items).toHaveLength(5);
    expect(page1.items.map((i: any) => i.id).some((id: string) => page2.items.map((i: any) => i.id).includes(id))).toBe(false);
    const byStatus = (await admin.get('/api/v1/admin/requests?status=IN_PROGRESS&pageSize=100')).body;
    expect(byStatus.items.every((i: any) => i.status === 'IN_PROGRESS')).toBe(true);
    const search = (await admin.get('/api/v1/admin/requests?q=Summary%20request%20one')).body;
    expect(search.items.map((i: any) => i.title)).toContain('Summary request one');
    const byCitizen = (await admin.get('/api/v1/admin/requests?q=summary-other@test.dev')).body;
    expect(byCitizen.total).toBe(1);
    const future = (await admin.get('/api/v1/admin/requests?from=2999-01-01')).body;
    expect(future.total).toBe(0);
    expect((await admin.get('/api/v1/admin/requests?sortBy=passwordHash')).status).toBe(400);
    expect((await admin.get('/api/v1/admin/requests?q=%25')).body.total).toBe(0); // wildcard is escaped, not a match-all
  });

  it('exports the filtered set as properly escaped CSV and neutralises formula injection', async () => {
    const c = await registerCitizen('csv@test.dev');
    await c.post('/api/v1/requests').send(validRequest(ctx.category.id, { title: '=HYPERLINK("http://x","hi"), "quoted"', location: 'Line1, Nakuru' }));
    const admin = await login('admin@test.dev');
    const res = await admin.get('/api/v1/admin/requests/export?q=csv@test.dev');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain(`"'=HYPERLINK(""http://x"",""hi""), ""quoted"""`);
    expect(res.text).toContain('"Line1, Nakuru"');
    expect(res.text.split('\n').filter(Boolean)).toHaveLength(2); // header + 1 row
  });

  it('manages categories and departments with audit entries and duplicate protection', async () => {
    const admin = await login('admin@test.dev');
    const created = await admin.post('/api/v1/admin/categories').send({ name: 'Public Parks', description: 'Parks', iconKey: 'trees' });
    expect(created.status).toBe(201);
    expect((await admin.post('/api/v1/admin/categories').send({ name: 'Public Parks' })).status).toBe(409);
    expect((await admin.patch(`/api/v1/admin/categories/${created.body.id}`).send({ isActive: false })).body.isActive).toBe(false);
    const citizen = await registerCitizen('catlist@test.dev');
    const names = (await citizen.get('/api/v1/categories')).body.items.map((c: any) => c.name);
    expect(names).not.toContain('Public Parks'); // inactive categories are hidden from citizens
    const d = await admin.post('/api/v1/admin/departments').send({ name: 'Parks Department', contactEmail: 'parks@example.org' });
    expect(d.status).toBe(201);
  });
});
