// Applies SQL migrations in ./drizzle. Safe for production: only forward migrations, never resets data.
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

await migrate(db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname });
console.log('Migrations applied.');
await pool.end();
