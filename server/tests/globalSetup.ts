import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://psrs:psrs_dev_password@localhost:5433/psrs_test';
  if (!/_test\b|test/.test(new URL(url).pathname)) throw new Error('Refusing to run tests against a non-test database');
  const pool = new pg.Pool({ connectionString: url });
  await migrate(drizzle(pool), { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
  await pool.end();
}
