import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, login, resetDb, seedBasics } from './helpers.js';

beforeAll(async () => { await resetDb(); await seedBasics(); });
afterAll(closeDb);

describe('analytics on an empty dataset', () => {
  it('returns zeros and nulls instead of dividing by zero', async () => {
    const admin = await login('admin@test.dev');
    const o = (await admin.get('/api/v1/admin/analytics/overview')).body;
    expect(o).toMatchObject({ total: 0, pending: 0, inProgress: 0, resolved: 0, resolutionRate: 0, avgResolutionHours: null, avgOpenAgeDays: null });
    const t = (await admin.get('/api/v1/admin/analytics/trends')).body;
    expect(t.submittedOverTime.every((d: any) => d.count === 0)).toBe(true);
    const list = (await admin.get('/api/v1/admin/requests')).body;
    expect(list).toMatchObject({ total: 0, items: [], totalPages: 1 });
  });
});
