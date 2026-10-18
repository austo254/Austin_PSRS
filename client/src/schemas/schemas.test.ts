import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema } from './auth';
import { requestSchema, validateImage } from './request';

const validReg = { fullName: 'Amina Hassan', email: 'a@b.co', password: 'StrongPass1x', confirmPassword: 'StrongPass1x', acceptPrivacy: true as const };
const uuid = '3f2b8c1e-8d4a-4b0e-9c57-1a2b3c4d5e6f';

describe('auth schemas', () => {
  it('accepts a valid registration', () => expect(registerSchema.safeParse(validReg).success).toBe(true));
  it('rejects mismatched passwords', () => expect(registerSchema.safeParse({ ...validReg, confirmPassword: 'Different1xx' }).success).toBe(false));
  it('rejects weak passwords', () => expect(registerSchema.safeParse({ ...validReg, password: 'short', confirmPassword: 'short' }).success).toBe(false));
  it('requires privacy acceptance', () => expect(registerSchema.safeParse({ ...validReg, acceptPrivacy: false }).success).toBe(false));
  it('rejects a malformed login email', () => expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false));
});

describe('request schema', () => {
  const ok = { categoryId: uuid, title: 'Broken light', location: 'Moi Avenue', description: 'The light has been out for a week.' };
  it('accepts a valid request', () => expect(requestSchema.safeParse(ok).success).toBe(true));
  it('rejects short descriptions and titles', () => {
    expect(requestSchema.safeParse({ ...ok, description: 'too short' }).success).toBe(false);
    expect(requestSchema.safeParse({ ...ok, title: 'abc' }).success).toBe(false);
  });
  it('rejects out-of-range coordinates', () => expect(requestSchema.safeParse({ ...ok, latitude: '120' }).success).toBe(false));
});

describe('validateImage', () => {
  const file = (type: string, size: number) => new File([new Uint8Array(size)], 'x', { type });
  it('accepts allowed types under the limit', () => expect(validateImage(file('image/png', 10), 100)).toBeNull());
  it('rejects unsupported types', () => expect(validateImage(file('application/pdf', 10), 100)).not.toBeNull());
  it('rejects oversized files', () => expect(validateImage(file('image/jpeg', 200), 100)).not.toBeNull());
});
