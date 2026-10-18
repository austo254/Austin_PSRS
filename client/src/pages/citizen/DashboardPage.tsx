import { Link, useNavigate } from 'react-router-dom';
import { Activity, CheckCircle2, CircleDot, Clock, FileText, Mail, Phone, Plus } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, Skeleton } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { StatusBadge } from '../../components/ui/Badges';
import { CardsSkeleton } from '../../components/ui/Skeletons';
import { StatCard } from '../../components/StatCard';
import { CitizenRequestsTable } from '../../components/CitizenRequestsTable';
import { NotificationList } from '../../components/NotificationList';
import { useAuth } from '../../features/auth/AuthContext';
import { useCategories, useCitizenSummary } from '../../features/requests/hooks';
import { useNotifications } from '../../features/notifications/hooks';
import { firstName, formatDate, initials, timeAgo } from '../../utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const summary = useCitizenSummary();
  const categories = useCategories();
  const notifs = useNotifications(5);
  const s = summary.data;

  const subtitle = !s ? 'Loading your activity…' : s.total === 0
    ? 'You have not reported any issues yet. Spot a problem in your area? Report it in a minute.'
    : `You have ${s.pending + s.inProgress} open ${s.pending + s.inProgress === 1 ? 'request' : 'requests'} and ${s.resolved} resolved.`;

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-navy to-[#1d2a6b] p-6 text-white">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {firstName(user!.fullName)}</h1>
          <p className="mt-1 max-w-xl text-sm text-white/80">{subtitle}</p>
        </div>
        <Button size="lg" onClick={() => navigate('/requests/new')}><Plus className="size-5" />Report an Issue</Button>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-6">
          <Card className="p-5 text-center">
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-navy text-2xl font-bold text-white" aria-hidden>{initials(user!.fullName)}</span>
            <h2 className="mt-3 font-semibold text-navy">{user!.fullName}</h2>
            <p className="text-xs uppercase tracking-wide text-muted">Citizen</p>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-left text-sm">
              <div className="flex items-center gap-2"><Mail className="size-4 shrink-0 text-muted" aria-hidden /><dt className="sr-only">Email</dt><dd className="truncate">{user!.email}</dd></div>
              <div className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-muted" aria-hidden /><dt className="sr-only">Phone</dt><dd>{user!.phoneNumber ?? 'No phone added'}</dd></div>
              <div className="flex items-center gap-2"><Clock className="size-4 shrink-0 text-muted" aria-hidden /><dt className="sr-only">Member since</dt><dd>Member since {formatDate(user!.createdAt)}</dd></div>
            </dl>
            <Link to="/profile" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Edit profile</Link>
          </Card>
          <Card>
            <CardHeader title="Latest activity" />
            {summary.isLoading ? <div className="space-y-2 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
              : s && s.recentActivity.length > 0 ? (
                <ul className="divide-y divide-line">
                  {s.recentActivity.map((a) => (
                    <li key={a.id}><Link to={`/requests/${a.requestId}`} className="block px-5 py-3 hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-navy">{a.trackingReference}</span><StatusBadge status={a.newStatus} /></div>
                      <p className="mt-1 text-xs text-muted">{timeAgo(a.createdAt)}</p>
                    </Link></li>
                  ))}
                </ul>
              ) : <EmptyState title="No activity yet" message="Status changes on your requests show up here." icon={<Activity className="size-6" />} />}
          </Card>
        </aside>

        <div className="min-w-0 space-y-6">
          {summary.isError ? <Card><ErrorState message="We couldn't load your summary." onRetry={() => summary.refetch()} /></Card>
            : summary.isLoading ? <CardsSkeleton /> : (
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard label="Total requests" value={s!.total} icon={FileText} tone="navy" />
                <StatCard label="Pending" value={s!.pending} icon={Clock} tone="pending" />
                <StatCard label="In progress" value={s!.inProgress} icon={CircleDot} tone="progress" />
                <StatCard label="Resolved" value={s!.resolved} icon={CheckCircle2} tone="resolved" />
              </div>
            )}

          <Card>
            <CardHeader title="Report by category" subtitle="Choose a service to start a request" action={<Link to="/services" className="text-sm font-semibold text-brand hover:underline">All services</Link>} />
            {categories.isLoading ? <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div> : (
              <ul className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
                {categories.data?.map((c) => (
                  <li key={c.id}>
                    <Link to={`/requests/new?category=${c.id}`} className="flex h-full items-start gap-3 rounded-lg border border-line p-3 transition hover:border-brand hover:bg-brand-soft/50">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><CategoryIcon iconKey={c.iconKey} className="size-5" /></span>
                      <span className="min-w-0"><span className="block text-sm font-semibold text-navy">{c.name}</span><span className="line-clamp-2 text-xs text-muted">{c.description}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <CitizenRequestsTable pageSize={5} title="Recent requests" />

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Notifications" action={<Link to="/notifications" className="text-sm font-semibold text-brand hover:underline">View all</Link>} />
              {notifs.isLoading ? <div className="p-5"><Skeleton className="h-16" /></div> : <NotificationList items={notifs.data?.items ?? []} compact />}
            </Card>
            <Card>
              <CardHeader title="Help &amp; FAQs" action={<Link to="/help" className="text-sm font-semibold text-brand hover:underline">More help</Link>} />
              <ul className="divide-y divide-line text-sm">
                {['How do I track my request?', 'How long does a resolution take?', 'Can I reopen a resolved request?', 'Who can see my report?'].map((q) => (
                  <li key={q}><Link to="/help" className="block px-5 py-3 text-slate-700 hover:bg-slate-50 hover:text-brand">{q}</Link></li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
