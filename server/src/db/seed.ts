/**
 * Idempotent seed. Safe to re-run: categories/departments/users are matched by unique name/email.
 *
 * Development (default): creates demo accounts with documented passwords (see README) and sample requests.
 * Production: refuses to run without SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, and only creates demo
 *             citizens/requests when SEED_DEMO_DATA=true (their password is SEED_DEMO_PASSWORD).
 * All demo rows are flagged users.is_demo = true so they can be told apart from real user-generated data.
 */
import crypto from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from './client.js';
import {
  departments, notifications, requestComments, requestStatusHistory, serviceCategories, serviceRequests, users,
} from './schema.js';
import { env, isProd } from '../config/env.js';
import { hashPassword } from '../modules/auth/auth.service.js';

const CATEGORIES = [
  ['Water Supply and Sanitation', 'Burst pipes, water shortages, sewer blockages', 'droplets'],
  ['Roads and Potholes', 'Potholes, damaged roads, missing signage', 'construction'],
  ['Street Lighting', 'Faulty or missing street lights', 'lightbulb'],
  ['Garbage Collection', 'Missed collections, illegal dumping', 'trash-2'],
  ['Drainage and Flooding', 'Blocked drains, flooding, stagnant water', 'waves'],
  ['Public Facilities', 'Parks, markets, public toilets, community halls', 'building-2'],
  ['Electricity and Public Infrastructure', 'Fallen poles, exposed wires, outages', 'zap'],
  ['Other Public Services', 'Anything not listed above', 'circle-help'],
] as const;

const DEPARTMENTS = [
  ['Water and Sanitation', 'Water supply, sewerage and sanitation services'],
  ['Roads and Transport', 'Road maintenance and traffic infrastructure'],
  ['Environment and Waste Management', 'Garbage collection, drainage and cleanliness'],
  ['Public Works and Facilities', 'Public buildings, parks and street lighting'],
  ['Energy and Utilities Liaison', 'Coordination with power utilities'],
] as const;

const adminEmail = (env.NODE_ENV === 'production' ? process.env.SEED_ADMIN_EMAIL : process.env.SEED_ADMIN_EMAIL ?? 'admin@psrs.demo')?.toLowerCase();
const adminPassword = isProd ? process.env.SEED_ADMIN_PASSWORD : process.env.SEED_ADMIN_PASSWORD ?? 'DemoAdmin#2026';
const seedDemo = isProd ? process.env.SEED_DEMO_DATA === 'true' : process.env.SEED_DEMO_DATA !== 'false';
const demoPassword = process.env.SEED_DEMO_PASSWORD ?? (isProd ? crypto.randomBytes(12).toString('base64url') + 'aA1' : 'DemoCitizen#2026');

if (isProd && (!adminEmail || !adminPassword)) {
  console.error('Refusing to seed production without SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.');
  process.exit(1);
}

async function ensureUser(fullName: string, email: string, password: string, role: 'ADMIN' | 'CITIZEN', isDemo: boolean, phone?: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing;
  const [u] = await db.insert(users).values({ fullName, email, passwordHash: await hashPassword(password), role, isDemo, phoneNumber: phone ?? null }).returning();
  return u;
}

const daysAgo = (d: number, hours = 0) => new Date(Date.now() - d * 86_400_000 - hours * 3_600_000);

async function main() {
  for (const [name, description, iconKey] of CATEGORIES) {
    await db.insert(serviceCategories).values({ name, description, iconKey }).onConflictDoNothing();
  }
  for (const [name, description] of DEPARTMENTS) {
    await db.insert(departments).values({ name, description, contactEmail: null }).onConflictDoNothing();
  }
  const admin = await ensureUser('System Administrator', adminEmail!, adminPassword!, 'ADMIN', !isProd);
  console.log(`Admin account ready: ${admin.email}`);

  if (!seedDemo) { console.log('Demo data skipped.'); return; }

  const staff = await ensureUser('Grace Wanjiru', 'staff@psrs.demo', adminPassword!, 'ADMIN', true);
  const citizens = [
    await ensureUser('Amina Hassan', 'amina@psrs.demo', demoPassword, 'CITIZEN', true, '+254700000001'),
    await ensureUser('Brian Otieno', 'brian@psrs.demo', demoPassword, 'CITIZEN', true, '+254700000002'),
    await ensureUser('Cynthia Mwangi', 'cynthia@psrs.demo', demoPassword, 'CITIZEN', true),
  ];

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(serviceRequests)
    .innerJoin(users, eq(users.id, serviceRequests.citizenId)).where(eq(users.isDemo, true));
  if (n > 0) { console.log('Demo requests already exist; skipping.'); return; }

  const cats = Object.fromEntries((await db.select().from(serviceCategories)).map((c) => [c.name, c.id]));
  const depts = Object.fromEntries((await db.select().from(departments)).map((d) => [d.name, d.id]));

  type Seed = { c: number; cat: string; title: string; loc: string; desc: string; age: number; status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'; dept?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; hoursToResolve?: number };
  const samples: Seed[] = [
    { c: 0, cat: 'Roads and Potholes', title: 'Large pothole near market entrance', loc: 'Kenyatta Avenue, Nakuru', desc: 'A deep pothole at the market entrance is damaging vehicles and is dangerous for pedestrians at night.', age: 80, status: 'RESOLVED', dept: 'Roads and Transport', priority: 'HIGH', hoursToResolve: 96 },
    { c: 1, cat: 'Street Lighting', title: 'Street lights out on Moi Road', loc: 'Moi Road, Eldoret', desc: 'Three consecutive street lights have been off for two weeks, making the road unsafe after dark.', age: 62, status: 'RESOLVED', dept: 'Public Works and Facilities', priority: 'MEDIUM', hoursToResolve: 150 },
    { c: 2, cat: 'Garbage Collection', title: 'Uncollected garbage for two weeks', loc: 'Estate B Gate 3, Kisumu', desc: 'Garbage has not been collected for two weeks and is attracting rodents and producing a strong smell.', age: 48, status: 'RESOLVED', dept: 'Environment and Waste Management', priority: 'HIGH', hoursToResolve: 52 },
    { c: 0, cat: 'Water Supply and Sanitation', title: 'Burst water main flooding the street', loc: 'Mombasa Road, near Total petrol station', desc: 'A water main has burst and clean water is flowing down the street continuously since morning.', age: 35, status: 'RESOLVED', dept: 'Water and Sanitation', priority: 'URGENT', hoursToResolve: 20 },
    { c: 1, cat: 'Drainage and Flooding', title: 'Blocked drain causing flooding', loc: 'Oginga Odinga Street, Kisumu', desc: 'The drain outside the shops is blocked and floods the walkway whenever it rains, entering several shops.', age: 20, status: 'IN_PROGRESS', dept: 'Environment and Waste Management', priority: 'HIGH' },
    { c: 2, cat: 'Public Facilities', title: 'Public toilets locked and unusable', loc: 'City Park Market, Nairobi', desc: 'The public toilets at the market have been locked for over a week with no notice to traders or visitors.', age: 14, status: 'IN_PROGRESS', dept: 'Public Works and Facilities', priority: 'MEDIUM' },
    { c: 0, cat: 'Electricity and Public Infrastructure', title: 'Leaning electricity pole', loc: 'Ngong Road, Karen', desc: 'An electricity pole is leaning heavily after a truck hit it and could fall onto the road at any time.', age: 6, status: 'PENDING', priority: 'URGENT' },
    { c: 1, cat: 'Roads and Potholes', title: 'Missing manhole cover', loc: 'Tom Mboya Street, Nairobi', desc: 'A manhole cover is missing on the pavement and is a serious hazard for pedestrians.', age: 4, status: 'PENDING', priority: 'HIGH' },
    { c: 2, cat: 'Other Public Services', title: 'Noise from unlicensed night club', loc: 'Westlands, Nairobi', desc: 'An unlicensed club plays loud music until 4am most nights, affecting the whole residential block.', age: 9, status: 'REJECTED', priority: 'LOW' },
    { c: 0, cat: 'Street Lighting', title: 'Flickering light at bus stop', loc: 'Thika Road bus stop 4', desc: 'The light at the bus stop flickers constantly and goes off completely for long periods in the evening.', age: 2, status: 'PENDING', priority: 'LOW' },
    { c: 1, cat: 'Garbage Collection', title: 'Illegal dumping behind the school', loc: 'Rhonda, Nakuru', desc: 'People are dumping rubbish behind the primary school; children walk past it every day to reach class.', age: 27, status: 'RESOLVED', dept: 'Environment and Waste Management', priority: 'MEDIUM', hoursToResolve: 70 },
    { c: 2, cat: 'Water Supply and Sanitation', title: 'No water supply for five days', loc: 'Ruiru Estate Phase 2', desc: 'Our block has had no running water for five days and no water bowser has come as promised.', age: 11, status: 'IN_PROGRESS', dept: 'Water and Sanitation', priority: 'URGENT' },
  ];

  for (const s of samples) {
    await db.transaction(async (tx) => {
      const { rows } = await tx.execute<{ n: string }>(sql`select nextval('request_tracking_seq') as n`);
      const submittedAt = daysAgo(s.age);
      const ref = `PSRS-${submittedAt.getUTCFullYear()}-${String(rows[0].n).padStart(6, '0')}`;
      const citizen = citizens[s.c];
      const resolvedAt = s.status === 'RESOLVED' ? new Date(submittedAt.getTime() + (s.hoursToResolve ?? 48) * 3_600_000) : null;
      const [r] = await tx.insert(serviceRequests).values({
        trackingReference: ref, citizenId: citizen.id, categoryId: cats[s.cat], title: s.title, description: s.desc, location: s.loc,
        status: s.status, priority: s.priority ?? 'MEDIUM', assignedDepartmentId: s.dept ? depts[s.dept] : null,
        assignedStaffId: s.dept ? staff.id : null, submittedAt, updatedAt: resolvedAt ?? (s.status === 'PENDING' ? submittedAt : daysAgo(Math.max(s.age - 3, 0))),
        resolvedAt, resolutionComment: resolvedAt ? 'Work completed by the responsible department and verified on site.' : null,
      }).returning();
      const hist = (prev: any, next: any, by: string, comment: string, at: Date) =>
        tx.insert(requestStatusHistory).values({ requestId: r.id, previousStatus: prev, newStatus: next, changedById: by, comment, createdAt: at });
      await hist(null, 'PENDING', citizen.id, 'Request submitted', submittedAt);
      if (s.status !== 'PENDING') {
        const t1 = new Date(submittedAt.getTime() + 6 * 3_600_000);
        if (s.status === 'REJECTED') {
          await hist('PENDING', 'REJECTED', admin.id, 'Outside municipal service scope; referred to the licensing authority.', t1);
        } else {
          await hist('PENDING', 'IN_PROGRESS', staff.id, 'Request reviewed and assigned.', t1);
          if (resolvedAt) await hist('IN_PROGRESS', 'RESOLVED', staff.id, r.resolutionComment ?? '', resolvedAt);
        }
      }
      if (s.status === 'IN_PROGRESS') {
        await tx.insert(requestComments).values({ requestId: r.id, authorId: staff.id, body: 'A crew has been scheduled; we will update you once work is complete.', visibility: 'PUBLIC', createdAt: daysAgo(Math.max(s.age - 2, 0)) });
        await tx.insert(requestComments).values({ requestId: r.id, authorId: staff.id, body: 'Internal: waiting on materials from stores before dispatching the crew.', visibility: 'INTERNAL', createdAt: daysAgo(Math.max(s.age - 2, 0)) });
      }
      await tx.insert(notifications).values({ userId: citizen.id, requestId: r.id, title: 'Request submitted', message: `Your request ${ref} was received and is awaiting review.`, isRead: s.status !== 'PENDING', createdAt: submittedAt });
      if (s.status === 'RESOLVED' && resolvedAt) await tx.insert(notifications).values({ userId: citizen.id, requestId: r.id, title: 'Your request has been resolved', message: `${ref}: status changed from In Progress to Resolved.`, isRead: s.age > 30, createdAt: resolvedAt });
    });
  }
  console.log(`Seeded ${samples.length} demo requests. Demo citizens: amina@, brian@, cynthia@psrs.demo`);
  if (isProd && !process.env.SEED_DEMO_PASSWORD) console.log(`Generated demo citizen password (shown once): ${demoPassword}`);
}

main().then(() => pool.end()).catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
