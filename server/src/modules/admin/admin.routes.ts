import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { departments, serviceCategories } from '../../db/schema.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { parse, wrap } from '../../utils/async.js';
import { conflict, notFound } from '../../utils/errors.js';
import { listQuerySchema, queryRequests } from '../requests/request.query.js';
import { recordAudit } from '../audit/audit.service.js';
import * as admin from './admin.service.js';
import * as analytics from '../analytics/analytics.service.js';
import {
  assignmentSchema, categoryPatchSchema, categorySchema, departmentPatchSchema, departmentSchema, noteSchema, statusChangeSchema,
} from './admin.schemas.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

const id = (v: unknown) => parse(z.string().uuid('Invalid id'), v);

// ---- Requests ----
adminRouter.get('/requests', wrap(async (req, res) => {
  res.json(await queryRequests(parse(listQuerySchema, req.query), { admin: true }));
}));

// Must be registered before "/requests/:id".
adminRouter.get('/requests/export', wrap(async (req, res) => {
  const csv = await admin.exportRequestsCsv(parse(listQuerySchema, req.query));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="psrs-requests-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${csv}`);
}));

adminRouter.get('/requests/:id', wrap(async (req, res) => { res.json(await admin.getAdminRequestDetail(id(req.params.id))); }));

adminRouter.patch('/requests/:id/status', wrap(async (req, res) => {
  const b = parse(statusChangeSchema, req.body);
  await admin.changeRequestStatus(id(req.params.id), req.auth!.user.id, b.status, b.comment, b.resolutionComment);
  res.json(await admin.getAdminRequestDetail(id(req.params.id)));
}));

adminRouter.patch('/requests/:id/assignment', wrap(async (req, res) => {
  await admin.assignRequest(id(req.params.id), req.auth!.user.id, parse(assignmentSchema, req.body));
  res.json(await admin.getAdminRequestDetail(id(req.params.id)));
}));

adminRouter.post('/requests/:id/notes', wrap(async (req, res) => {
  const b = parse(noteSchema, req.body);
  await admin.addAdminNote(id(req.params.id), req.auth!.user.id, b.body, b.visibility);
  res.status(201).json(await admin.getAdminRequestDetail(id(req.params.id)));
}));

adminRouter.get('/staff', wrap(async (_req, res) => { res.json({ items: await admin.listStaff() }); }));

// ---- Analytics ----
adminRouter.get('/analytics/overview', wrap(async (_req, res) => { res.json(await analytics.overview()); }));
adminRouter.get('/analytics/by-status', wrap(async (_req, res) => { res.json({ items: await analytics.byStatus() }); }));
adminRouter.get('/analytics/by-category', wrap(async (_req, res) => { res.json({ items: await analytics.byCategory() }); }));
adminRouter.get('/analytics/trends', wrap(async (req, res) => {
  const { days } = parse(z.object({ days: z.coerce.number().int().min(7).max(180).default(30) }), req.query);
  res.json(await analytics.trends(days));
}));

// ---- Categories ----
adminRouter.get('/categories', wrap(async (_req, res) => {
  res.json({ items: await db.select().from(serviceCategories).orderBy(asc(serviceCategories.name)) });
}));

adminRouter.post('/categories', wrap(async (req, res) => {
  const input = parse(categorySchema, req.body);
  try {
    const row = await db.transaction(async (tx) => {
      const [c] = await tx.insert(serviceCategories).values(input).returning();
      await recordAudit(tx, { actorId: req.auth!.user.id, action: 'category.created', entityType: 'category', entityId: c.id, metadata: { name: c.name } });
      return c;
    });
    res.status(201).json(row);
  } catch (e: any) {
    if (e?.code === '23505' || e?.cause?.code === '23505') throw conflict('A category with this name already exists');
    throw e;
  }
}));

adminRouter.patch('/categories/:id', wrap(async (req, res) => {
  const patch = parse(categoryPatchSchema, req.body);
  try {
    const row = await db.transaction(async (tx) => {
      const [c] = await tx.update(serviceCategories).set({ ...patch, updatedAt: new Date() }).where(eq(serviceCategories.id, id(req.params.id))).returning();
      if (!c) throw notFound('Category not found');
      await recordAudit(tx, { actorId: req.auth!.user.id, action: 'category.updated', entityType: 'category', entityId: c.id, metadata: patch });
      return c;
    });
    res.json(row);
  } catch (e: any) {
    if (e?.code === '23505' || e?.cause?.code === '23505') throw conflict('A category with this name already exists');
    throw e;
  }
}));

// ---- Departments ----
adminRouter.get('/departments', wrap(async (_req, res) => {
  res.json({ items: await db.select().from(departments).orderBy(asc(departments.name)) });
}));

adminRouter.post('/departments', wrap(async (req, res) => {
  const input = parse(departmentSchema, req.body);
  try {
    const row = await db.transaction(async (tx) => {
      const [d] = await tx.insert(departments).values({ ...input, contactEmail: input.contactEmail ?? null }).returning();
      await recordAudit(tx, { actorId: req.auth!.user.id, action: 'department.created', entityType: 'department', entityId: d.id, metadata: { name: d.name } });
      return d;
    });
    res.status(201).json(row);
  } catch (e: any) {
    if (e?.code === '23505' || e?.cause?.code === '23505') throw conflict('A department with this name already exists');
    throw e;
  }
}));

adminRouter.patch('/departments/:id', wrap(async (req, res) => {
  const patch = parse(departmentPatchSchema, req.body);
  try {
    const row = await db.transaction(async (tx) => {
      const [d] = await tx.update(departments).set({ ...patch, updatedAt: new Date() }).where(eq(departments.id, id(req.params.id))).returning();
      if (!d) throw notFound('Department not found');
      await recordAudit(tx, { actorId: req.auth!.user.id, action: 'department.updated', entityType: 'department', entityId: d.id, metadata: patch });
      return d;
    });
    res.json(row);
  } catch (e: any) {
    if (e?.code === '23505' || e?.cause?.code === '23505') throw conflict('A department with this name already exists');
    throw e;
  }
}));
