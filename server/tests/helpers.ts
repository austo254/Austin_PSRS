import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db, pool } from '../src/db/client.js';
import { departments, serviceCategories, users } from '../src/db/schema.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';

export const app = createApp();
export const PASSWORD = 'StrongPass123';

export async function resetDb() {
  await db.execute(sql`truncate table audit_logs, notifications, request_comments, request_status_history, service_requests,
    sessions, password_reset_tokens, service_categories, departments, users restart identity cascade`);
  await db.execute(sql`alter sequence request_tracking_seq restart with 1`);
}

export async function seedBasics() {
  const [category] = await db.insert(serviceCategories).values({ name: 'Roads and Potholes', description: 'Roads', iconKey: 'construction' }).returning();
  const [category2] = await db.insert(serviceCategories).values({ name: 'Street Lighting', description: 'Lights', iconKey: 'lightbulb' }).returning();
  const [department] = await db.insert(departments).values({ name: 'Roads and Transport', description: 'Roads dept' }).returning();
  const hash = await hashPassword(PASSWORD);
  const [admin] = await db.insert(users).values({ fullName: 'Test Admin', email: 'admin@test.dev', passwordHash: hash, role: 'ADMIN' }).returning();
  return { category, category2, department, admin };
}

/** A logged-in supertest agent that automatically sends the CSRF token on state-changing calls. */
export async function login(email: string, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  const csrf: string = res.body.csrfToken;
  const wrap = (method: 'post' | 'patch' | 'put' | 'delete') => (url: string) => (agent as any)[method](url).set('X-CSRF-Token', csrf);
  return { agent, csrf, get: (url: string) => agent.get(url), post: wrap('post'), patch: wrap('patch'), del: wrap('delete'), user: res.body.user };
}

export async function registerCitizen(email: string, fullName = 'Test Citizen') {
  const res = await request(app).post('/api/v1/auth/register').send({
    fullName, email, password: PASSWORD, confirmPassword: PASSWORD, acceptPrivacy: true,
  });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return login(email);
}

export const validRequest = (categoryId: string, over: Record<string, unknown> = {}) => ({
  title: 'Large pothole on main road', categoryId, location: 'Main Road, Nakuru',
  description: 'There is a large pothole in the middle of the road that is damaging vehicles.', ...over,
});

export async function closeDb() { await pool.end(); }
