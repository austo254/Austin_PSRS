import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean().optional(),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  phoneNumber: z.string().trim().regex(/^(\+?[0-9 ()-]{7,20})?$/, 'Enter a valid phone number').optional(),
  password: z.string().min(10, 'At least 10 characters').regex(/[a-z]/, 'Add a lowercase letter').regex(/[A-Z]/, 'Add an uppercase letter').regex(/[0-9]/, 'Add a number'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
  acceptPrivacy: z.literal(true, { errorMap: () => ({ message: 'You must accept the privacy notice' }) }),
}).refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
export type RegisterForm = z.infer<typeof registerSchema>;
