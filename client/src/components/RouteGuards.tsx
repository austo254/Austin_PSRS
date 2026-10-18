import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Skeleton } from './ui/Layout';

/** Frontend guard for UX only; the API independently enforces authentication and roles. */
export function RequireRole({ role }: { role: 'CITIZEN' | 'ADMIN' }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="mx-auto max-w-5xl space-y-4 p-8" role="status" aria-label="Loading"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (user.role !== role) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />;
  return <Outlet />;
}
