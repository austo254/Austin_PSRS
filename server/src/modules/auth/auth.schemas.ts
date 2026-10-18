import { z } from 'zod';

export const passwordRule = z.string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[0-9]/, 'Password needs a number');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  phoneNumber: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number').optional().or(z.literal('').transform(() => undefined)),
  password: passwordRule,
  confirmPassword: z.string(),
  acceptPrivacy: z.literal(true, { error: 'You must accept the privacy notice' }),
}).refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password').max(128),
  remember: z.boolean().optional(),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phoneNumber: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number').nullable().optional(),
}).strict();

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordRule });
