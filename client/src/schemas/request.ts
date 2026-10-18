import { z } from 'zod';

export const requestSchema = z.object({
  categoryId: z.string().uuid('Choose a service category'),
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(150, 'Title must be 150 characters or fewer'),
  location: z.string().trim().min(3, 'Tell us where the problem is').max(200, 'Location must be 200 characters or fewer'),
  description: z.string().trim().min(20, 'Please describe the issue in at least 20 characters').max(2000, 'Description must be 2000 characters or fewer'),
  latitude: z.string().trim().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Math.abs(Number(v)) <= 90), 'Latitude must be between -90 and 90').optional(),
  longitude: z.string().trim().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Math.abs(Number(v)) <= 180), 'Longitude must be between -180 and 180').optional(),
});
export type RequestForm = z.infer<typeof requestSchema>;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Client-side pre-check only; the server re-validates the real file content. */
export function validateImage(file: File, maxBytes: number): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Only JPEG, PNG or WebP images are supported';
  if (file.size > maxBytes) return `Image must be smaller than ${(maxBytes / 1024 / 1024).toFixed(0)} MB`;
  return null;
}
