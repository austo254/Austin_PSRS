import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import path from 'node:path';
import fs from 'node:fs';
import { env, clientOrigins } from './config/env.js';
import { logger } from './utils/logger.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { csrfProtection, loadSession } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { pool } from './db/client.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Railway terminates TLS at a proxy
  app.disable('x-powered-by');

  app.use(pinoHttp({
    logger,
    serializers: { req: (r) => ({ method: r.method, url: r.url.split('?')[0] }), res: (r) => ({ statusCode: r.statusCode }) },
  }));
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", ...clientOrigins],
      },
    },
  }));
  app.use(cors({ origin: clientOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Health check is unauthenticated and cheap; also verifies DB connectivity for Railway.
  app.get('/api/health', async (_req, res) => {
    try { await pool.query('select 1'); res.json({ status: 'ok' }); }
    catch { res.status(503).json({ status: 'degraded' }); }
  });

  app.use('/api/v1', apiLimiter, loadSession, csrfProtection, apiRouter);
  app.use('/api', notFoundHandler);

  // Optionally serve the built React app from the same origin (simplest, most secure Railway setup).
  if (env.SERVE_CLIENT === 'true') {
    const dist = path.resolve(env.CLIENT_DIST_DIR);
    if (fs.existsSync(dist)) {
      app.use(express.static(dist, { index: false, maxAge: '1h' }));
      app.get('*splat', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
    }
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
