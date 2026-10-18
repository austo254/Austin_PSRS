import { z } from 'zod';

const coord = (min: number, max: number) =>
  z.string().trim().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), 'Invalid coordinate')
    .transform((v) => (v === '' ? undefined : v)).optional();

export const createRequestSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(150, 'Title must be 150 characters or fewer'),
  categoryId: z.string().uuid('Choose a service category'),
  location: z.string().trim().min(3, 'Tell us where the problem is').max(200),
  description: z.string().trim().min(20, 'Please describe the issue in at least 20 characters').max(2000, 'Description must be 2000 characters or fewer'),
  latitude: coord(-90, 90),
  longitude: coord(-180, 180),
});

// Citizens may only edit descriptive fields, and only while the request is still PENDING. Status/priority are not accepted.
export const citizenUpdateSchema = z.object({
  title: createRequestSchema.shape.title.optional(),
  location: createRequestSchema.shape.location.optional(),
  description: createRequestSchema.shape.description.optional(),
}).strict();

export const commentSchema = z.object({ body: z.string().trim().min(1, 'Write a comment').max(1000) }).strict();
export const reopenSchema = z.object({ reason: z.string().trim().min(5, 'Please explain why').max(1000) }).strict();
