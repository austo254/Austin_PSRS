import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { parse, wrap } from '../../utils/async.js';
import { listNotifications, markAllRead, markRead } from './notification.service.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

const listQuery = z.object({
  unread: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

notificationRouter.get('/', wrap(async (req, res) => {
  const q = parse(listQuery, req.query);
  res.json(await listNotifications(req.auth!.user.id, { unreadOnly: q.unread === 'true', limit: q.limit }));
}));

notificationRouter.post('/read-all', wrap(async (req, res) => {
  await markAllRead(req.auth!.user.id);
  res.status(204).end();
}));

notificationRouter.patch('/:id/read', wrap(async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  await markRead(req.auth!.user.id, id);
  res.status(204).end();
}));
