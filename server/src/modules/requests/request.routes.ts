import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { parse, wrap } from '../../utils/async.js';
import { citizenUpdateSchema, commentSchema, createRequestSchema, reopenSchema } from './request.schemas.js';
import { listQuerySchema, queryRequests } from './request.query.js';
import {
  addCitizenComment, citizenSummary, createRequest, getComments, getHistory, getOwnedRequest, reopenRequest,
  toCitizenRequest, updateOwnedRequest,
} from './request.service.js';
import { imageUpload, storeImageIfPresent } from './upload.js';

export const requestRouter = Router();
requestRouter.use(requireAuth, requireRole('CITIZEN'));

const idParam = (v: unknown) => parse(z.string().uuid('Invalid request id'), v);

requestRouter.post('/', imageUpload, wrap(async (req, res) => {
  const input = parse(createRequestSchema, req.body);
  const imageUrl = await storeImageIfPresent(req.file);
  const created = await createRequest(req.auth!.user.id, input, imageUrl);
  res.status(201).json({ id: created.id, trackingReference: created.trackingReference, status: created.status });
}));

requestRouter.get('/', wrap(async (req, res) => {
  const q = parse(listQuerySchema, req.query);
  res.json(await queryRequests(q, { citizenId: req.auth!.user.id }));
}));

requestRouter.get('/summary', wrap(async (req, res) => {
  res.json(await citizenSummary(req.auth!.user.id));
}));

requestRouter.get('/:id', wrap(async (req, res) => {
  const row = await getOwnedRequest(req.auth!.user.id, idParam(req.params.id));
  res.json(toCitizenRequest(row));
}));

requestRouter.patch('/:id', wrap(async (req, res) => {
  const id = idParam(req.params.id);
  await updateOwnedRequest(req.auth!.user.id, id, parse(citizenUpdateSchema, req.body));
  res.json(toCitizenRequest(await getOwnedRequest(req.auth!.user.id, id)));
}));

requestRouter.get('/:id/history', wrap(async (req, res) => {
  const id = idParam(req.params.id);
  await getOwnedRequest(req.auth!.user.id, id); // ownership check
  res.json({ items: await getHistory(id) });
}));

requestRouter.get('/:id/comments', wrap(async (req, res) => {
  const id = idParam(req.params.id);
  await getOwnedRequest(req.auth!.user.id, id);
  res.json({ items: await getComments(id, false) }); // INTERNAL notes are never returned to citizens
}));

requestRouter.post('/:id/comments', wrap(async (req, res) => {
  const { body } = parse(commentSchema, req.body);
  await addCitizenComment(req.auth!.user.id, idParam(req.params.id), body);
  res.status(201).json({ ok: true });
}));

requestRouter.post('/:id/reopen', wrap(async (req, res) => {
  const { reason } = parse(reopenSchema, req.body);
  await reopenRequest(req.auth!.user.id, idParam(req.params.id), reason);
  res.json(toCitizenRequest(await getOwnedRequest(req.auth!.user.id, idParam(req.params.id))));
}));
