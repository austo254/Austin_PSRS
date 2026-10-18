import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useAuth } from '../../features/auth/AuthContext';
import { registerSchema, type RegisterForm } from '../../schemas/auth';
import { ApiError } from '../../services/api';

export default function RegisterPage() {
  const { user, register: signUp } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await signUp({ ...v, phoneNumber: v.phoneNumber || undefined });
      toast.success('Account created. Welcome to PSRS!');
      navigate('/', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) setError('email', { message: 'An account with this email already exists' });
        else { for (const [k, m] of Object.entries(e.fields)) setError(k as keyof RegisterForm, { message: String(m) }); setFormError(e.message); }
      } else setFormError('Something went wrong. Please try again.');
    }
  });

  return (
    <AuthLayout>
      <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Create account">
        {formError && <div role="alert" className="rounded-lg border border-rejected/30 bg-rejected-soft px-4 py-3 text-sm text-rejected">{formError}</div>}
        <TextField label="Full name" autoComplete="name" required error={errors.fullName?.message} {...register('fullName')} />
        <TextField label="Email address" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
        <TextField label="Phone number (optional)" type="tel" autoComplete="tel" placeholder="+254 7xx xxx xxx" error={errors.phoneNumber?.message} {...register('phoneNumber')} />
        <TextField
          label="Password" type={show ? 'text' : 'password'} autoComplete="new-password" required hint="At least 10 characters with upper case, lower case and a number." error={errors.password?.message} {...register('password')}
          trailing={<button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="rounded p-2 text-muted hover:text-navy">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
        />
        <TextField label="Confirm password" type={show ? 'text' : 'password'} autoComplete="new-password" required error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 accent-brand" aria-invalid={!!errors.acceptPrivacy} {...register('acceptPrivacy')} />
            <span>I have read and accept the <Link to="/privacy" target="_blank" className="font-medium text-brand underline">privacy notice</Link> and understand this is an academic demonstration.</span></label>
          {errors.acceptPrivacy && <p role="alert" className="mt-1 text-xs text-rejected">{errors.acceptPrivacy.message}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</Button>
        <p className="text-center text-sm text-muted">Already registered? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
