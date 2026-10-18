import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { pool } from './db/client.js';
import { purgeExpiredSessions } from './modules/auth/session.service.js';

const app = createApp();
// Railway injects PORT; bind to 0.0.0.0 so the platform proxy can reach us.
const server = app.listen(env.PORT, '0.0.0.0', () => logger.info(`PSRS API listening on :${env.PORT}`));

const purge = setInterval(() => { purgeExpiredSessions().catch((e) => logger.warn({ e }, 'session purge failed')); }, 3_600_000);
purge.unref();

const shutdown = () => { server.close(async () => { await pool.end(); process.exit(0); }); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
