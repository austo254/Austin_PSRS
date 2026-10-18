import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { serviceCategories } from '../../db/schema.js';
import { requireAuth } from '../../middleware/auth.js';
import { wrap } from '../../utils/async.js';
import { env } from '../../config/env.js';
import { getStorage } from '../../services/storage.js';

export const categoryRouter = Router();

// Active categories for the submission form and dashboard tiles.
categoryRouter.get('/categories', requireAuth, wrap(async (_req, res) => {
  const items = await db.select().from(serviceCategories).where(eq(serviceCategories.isActive, true)).orderBy(asc(serviceCategories.name));
  res.json({ items });
}));

// Public runtime config so the UI can explain when uploads are unavailable.
categoryRouter.get('/config', (_req, res) => {
  res.json({ uploadsEnabled: !!getStorage(), uploadMaxBytes: env.UPLOAD_MAX_BYTES, passwordResetMode: env.PASSWORD_RESET_MODE });
});
