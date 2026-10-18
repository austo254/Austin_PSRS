import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useAuth } from '../../features/auth/AuthContext';
import { loginSchema, type LoginForm } from '../../schemas/auth';
import { ApiError } from '../../services/api';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { remember: false } });

  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />;

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const u = await login(v.email, v.password, !!v.remember);
      toast.success(`Welcome back, ${u.fullName.split(' ')[0]}`);
      navigate(location.state?.from ?? (u.role === 'ADMIN' ? '/admin' : '/'), { replace: true });
    } catch (e) {
      setFormError(e instanceof ApiError ? (e.status === 401 ? 'Incorrect email or password. Please try again.' : e.message) : 'Something went wrong. Please try again.');
    }
  });

  return (
    <AuthLayout>
      <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Sign in">
        {formError && <div role="alert" className="rounded-lg border border-rejected/30 bg-rejected-soft px-4 py-3 text-sm text-rejected">{formError}</div>}
        <TextField label="Email address" type="email" autoComplete="email" placeholder="you@example.com" required error={errors.email?.message} {...register('email')} />
        <TextField
          label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" required error={errors.password?.message} {...register('password')}
          trailing={<button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="rounded p-2 text-muted hover:text-navy">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-brand" {...register('remember')} />Remember me on this device</label>
          <Link to="/forgot-password" className="font-medium text-brand hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
        <p className="text-center text-sm text-muted">New to PSRS? <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link></p>
      </form>
    </AuthLayout>
  );
}
