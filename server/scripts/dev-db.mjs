// Local development/test Postgres using the embedded-postgres package.
// Not used in production (Railway provides a managed PostgreSQL instance).
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';

const dataDir = process.env.PG_DATA_DIR ?? './.pgdata';
const port = Number(process.env.PG_PORT ?? 5433);
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'psrs',
  password: 'psrs_dev_password',
  port,
  persistent: true,
});

if (!fs.existsSync(`${dataDir}/PG_VERSION`)) await pg.initialise();
await pg.start();
for (const db of ['psrs_dev', 'psrs_test']) {
  try { await pg.createDatabase(db); } catch { /* already exists */ }
}
console.log(`Postgres ready on port ${port}`);
process.on('SIGINT', async () => { await pg.stop(); process.exit(0); });
process.on('SIGTERM', async () => { await pg.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
