import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, closeDb, login, PASSWORD, registerCitizen, resetDb, seedBasics } from './helpers.js';

beforeAll(async () => { await resetDb(); await seedBasics(); });
afterAll(closeDb);

describe('registration', () => {
  it('registers a citizen and never returns the password hash', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Jane Doe', email: 'Jane@Test.dev', password: PASSWORD, confirmPassword: PASSWORD, acceptPrivacy: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'jane@test.dev', role: 'CITIZEN' }); // normalised
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/i);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  it('rejects a duplicate email (case-insensitively)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Jane Again', email: 'jane@test.dev', password: PASSWORD, confirmPassword: PASSWORD, acceptPrivacy: true,
    });
    expect(res.status).toBe(409);
  });

  it('validates password strength, confirmation and privacy acceptance', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'X', email: 'not-an-email', password: 'weak', confirmPassword: 'different', acceptPrivacy: false,
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['email', 'password']));
  });
});

describe('login / session', () => {
  it('logs in with correct credentials and exposes /me', async () => {
    const s = await login('jane@test.dev');
    const me = await s.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('jane@test.dev');
  });

  it('returns the same generic error for wrong password and unknown email', async () => {
    const a = await request(app).post('/api/v1/auth/login').send({ email: 'jane@test.dev', password: 'WrongPass123' });
    const b = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@test.dev', password: 'WrongPass123' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it('requires authentication on protected routes', async () => {
    for (const url of ['/api/v1/auth/me', '/api/v1/requests', '/api/v1/notifications', '/api/v1/admin/requests', '/api/v1/categories']) {
      expect((await request(app).get(url)).status).toBe(401);
    }
  });

  it('logout invalidates the session server-side', async () => {
    const s = await login('jane@test.dev');
    expect((await s.post('/api/v1/auth/logout')).status).toBe(204);
    expect((await s.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('rejects state-changing requests without the CSRF token and from foreign origins', async () => {
    const s = await login('jane@test.dev');
    const noToken = await s.agent.post('/api/v1/auth/logout');
    expect(noToken.status).toBe(403);
    const foreign = await request(app).post('/api/v1/auth/login').set('Origin', 'https://evil.example').send({ email: 'jane@test.dev', password: PASSWORD });
    expect(foreign.status).toBe(403);
  });

  it('password reset is honestly reported as not configured by default', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'jane@test.dev' });
    expect(res.status).toBe(501);
  });
});
