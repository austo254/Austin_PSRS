import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { RequireRole } from './components/RouteGuards';
import { Skeleton } from './components/ui/Layout';
import { CitizenLayout } from './layouts/CitizenLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { useAuth } from './features/auth/AuthContext';

// Route-level code splitting keeps the first load small (Recharts only loads for admins).
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const DashboardPage = lazy(() => import('./pages/citizen/DashboardPage'));
const ServicesPage = lazy(() => import('./pages/citizen/ServicesPage'));
const MyRequestsPage = lazy(() => import('./pages/citizen/MyRequestsPage'));
const NewRequestPage = lazy(() => import('./pages/citizen/NewRequestPage'));
const SubmittedPage = lazy(() => import('./pages/citizen/SubmittedPage'));
const RequestDetailPage = lazy(() => import('./pages/citizen/RequestDetailPage'));
const NotificationsPage = lazy(() => import('./pages/citizen/NotificationsPage'));
const HelpPage = lazy(() => import('./pages/citizen/HelpPage'));
const ProfilePage = lazy(() => import('./pages/citizen/ProfilePage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminRequestsPage = lazy(() => import('./pages/admin/AdminRequestsPage'));
const AdminRequestDetailPage = lazy(() => import('./pages/admin/AdminRequestDetailPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminDepartmentsPage = lazy(() => import('./pages/admin/AdminDepartmentsPage'));

const Loading = () => <div className="mx-auto max-w-5xl space-y-4 p-8" role="status" aria-label="Loading"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>;

function NotFound() {
  const { user } = useAuth();
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-extrabold text-brand">404</p>
        <h1 className="mt-2 text-xl font-bold text-navy">Page not found</h1>
        <p className="mt-1 text-sm text-muted">The page you are looking for does not exist or has moved.</p>
        <Link to={user?.role === 'ADMIN' ? '/admin' : user ? '/' : '/login'} className="mt-4 inline-block font-semibold text-brand hover:underline">Go to the home page</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route element={<RequireRole role="CITIZEN" />}>
            <Route element={<CitizenLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/requests" element={<MyRequestsPage />} />
              <Route path="/requests/new" element={<NewRequestPage />} />
              <Route path="/requests/:id" element={<RequestDetailPage />} />
              <Route path="/requests/:id/submitted" element={<SubmittedPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="requests" element={<AdminRequestsPage />} />
              <Route path="requests/:id" element={<AdminRequestDetailPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="departments" element={<AdminDepartmentsPage />} />
              <Route path="notifications" element={<NotificationsPage admin />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
