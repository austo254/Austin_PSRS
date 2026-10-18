import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, CircleDot, Clock, FileText, Percent, Timer } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui/Layout';
import { CardsSkeleton } from '../../components/ui/Skeletons';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/ui/Badges';
import { FilterSelect } from '../../components/ui/Field';
import { useAdminRequests, useByCategory, useByStatus, useOverview, useTrends } from '../../features/admin/hooks';
import { formatDate, formatDuration, STATUS_LABEL } from '../../utils/format';

const STATUS_COLOR: Record<string, string> = { PENDING: '#d97706', IN_PROGRESS: '#2563eb', RESOLVED: '#16a34a', REJECTED: '#b4414a', REOPENED: '#a16207' };
const axis = { fontSize: 12, fill: '#64748b' };

function ChartCard({ title, subtitle, loading, error, empty, children, action }: { title: string; subtitle?: string; loading: boolean; error: boolean; empty: boolean; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className="p-4">
        {loading ? <Skeleton className="h-64" /> : error ? <ErrorState message="Couldn't load this chart." /> : empty ? <EmptyState title="No data yet" message="This chart fills in as requests are submitted." /> : <div className="h-64 w-full">{children}</div>}
      </div>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [days, setDays] = useState(30);
  const overview = useOverview();
  const byStatus = useByStatus();
  const byCategory = useByCategory();
  const trends = useTrends(days);
  const recent = useAdminRequests({ page: 1, pageSize: 6, sortBy: 'submittedAt', sortDir: 'desc' });
  const o = overview.data;
  const statusData = (byStatus.data ?? []).map((d) => ({ ...d, label: STATUS_LABEL[d.status] }));
  const catData = (byCategory.data ?? []).map((c) => ({ ...c, short: c.name.length > 18 ? `${c.name.slice(0, 17)}…` : c.name }));

  return (
    <>
      <PageHeader title="Service overview" description="Live statistics calculated from the request database." />
      {overview.isError ? <Card><ErrorState message="We couldn't load the overview." onRetry={() => overview.refetch()} /></Card> : overview.isLoading ? <CardsSkeleton n={6} /> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
          <StatCard label="Total requests" value={o!.total} icon={FileText} tone="navy" />
          <StatCard label="Pending" value={o!.pending} icon={Clock} tone="pending" />
          <StatCard label="In progress" value={o!.inProgress} icon={CircleDot} tone="progress" />
          <StatCard label="Resolved" value={o!.resolved} icon={CheckCircle2} tone="resolved" />
          <StatCard label="Resolution rate" value={`${o!.resolutionRate}%`} icon={Percent} tone="brand" hint="Resolved ÷ (all − rejected)" />
          <StatCard label="Avg. resolution time" value={formatDuration(o!.avgResolutionHours)} icon={Timer} tone="navy" hint={o!.avgOpenAgeDays !== null ? `Open requests avg ${o!.avgOpenAgeDays} days old` : 'No open requests'} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="Requests by status" loading={byStatus.isLoading} error={byStatus.isError} empty={statusData.every((d) => d.count === 0)}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={statusData} dataKey="count" nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                {statusData.map((d) => <Cell key={d.status} fill={STATUS_COLOR[d.status]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Requests by category" loading={byCategory.isLoading} error={byCategory.isError} empty={catData.every((d) => d.count === 0)}>
          <ResponsiveContainer>
            <BarChart data={catData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5ebef" />
              <XAxis type="number" allowDecimals={false} tick={axis} /><YAxis type="category" dataKey="short" width={120} tick={axis} />
              <Tooltip formatter={(v) => [v, 'Requests']} labelFormatter={(_, p) => p?.[0]?.payload?.name} /><Bar dataKey="count" name="Requests" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Requests submitted over time" subtitle={`Last ${days} days`} loading={trends.isLoading} error={trends.isError} empty={!trends.data || trends.data.submittedOverTime.every((d) => d.count === 0)}
          action={<FilterSelect label="Time range" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option></FilterSelect>}>
          <ResponsiveContainer>
            <LineChart data={trends.data?.submittedOverTime} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ebef" />
              <XAxis dataKey="date" tick={axis} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} /><YAxis allowDecimals={false} tick={axis} />
              <Tooltip /><Line type="monotone" dataKey="count" name="Submitted" stroke="#11164a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly resolution trend" subtitle="Submitted vs resolved, last 12 months" loading={trends.isLoading} error={trends.isError} empty={!trends.data || trends.data.monthlyResolution.every((d) => d.submitted === 0 && d.resolved === 0)}>
          <ResponsiveContainer>
            <BarChart data={trends.data?.monthlyResolution} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5ebef" />
              <XAxis dataKey="month" tick={axis} tickFormatter={(m: string) => m.slice(2)} /><YAxis allowDecimals={false} tick={axis} />
              <Tooltip /><Legend />
              <Bar dataKey="submitted" name="Submitted" fill="#11164a" radius={[3, 3, 0, 0]} /><Bar dataKey="resolved" name="Resolved" fill="#16a34a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="mt-6">
        <CardHeader title="Latest requests" action={<Link to="/admin/requests" className="text-sm font-semibold text-brand hover:underline">Manage all</Link>} />
        {recent.isLoading ? <div className="p-5"><Skeleton className="h-32" /></div> : (
          <ul className="divide-y divide-line">
            {recent.data?.items.map((r) => (
              <li key={r.id}><Link to={`/admin/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                <span className="min-w-0"><span className="font-mono text-xs font-semibold text-navy">{r.trackingReference}</span><span className="ml-2 text-sm">{r.title}</span><span className="ml-2 text-xs text-muted">{r.citizenName} · {formatDate(r.submittedAt)}</span></span>
                <StatusBadge status={r.status} />
              </Link></li>
            ))}
            {recent.data?.items.length === 0 && <li><EmptyState title="No requests yet" /></li>}
          </ul>
        )}
      </Card>
    </>
  );
}
