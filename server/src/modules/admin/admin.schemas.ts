import { z } from 'zod';
import { PRIORITIES, REQUEST_STATUSES } from '../../constants.js';

export const statusChangeSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  comment: z.string().trim().max(1000).optional(),
  resolutionComment: z.string().trim().max(2000).optional(),
}).strict();

export const assignmentSchema = z.object({
  departmentId: z.string().uuid().nullable().optional(),
  staffId: z.string().uuid().nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
}).strict();

export const noteSchema = z.object({
  body: z.string().trim().min(1, 'Write a note').max(2000),
  visibility: z.enum(['PUBLIC', 'INTERNAL']),
}).strict();

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).default(''),
  iconKey: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, 'Use a lucide icon name such as "droplets"').default('circle-help'),
  isActive: z.boolean().default(true),
});
export const categoryPatchSchema = categorySchema.partial().strict();

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).default(''),
  contactEmail: z.string().trim().email().max(254).nullable().optional(),
  isActive: z.boolean().default(true),
});
export const departmentPatchSchema = departmentSchema.partial().strict();
