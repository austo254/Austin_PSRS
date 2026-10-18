import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ClipboardList, Plus, Search } from 'lucide-react';
import { Card, EmptyState, ErrorState } from './ui/Layout';
import { Button } from './ui/Button';
import { FilterSelect } from './ui/Field';
import { StatusBadge } from './ui/Badges';
import { Pagination } from './ui/Pagination';
import { TableSkeleton } from './ui/Skeletons';
import { useMyRequests } from '../features/requests/hooks';
import { formatDate, timeAgo, STATUS_LABEL } from '../utils/format';
import { useDebounced } from '../hooks/useDebounced';

/** The citizen's own requests with search, status filter, date sort and pagination (all server-side). */
export function CitizenRequestsTable({ pageSize = 10, title = 'My requests' }: { pageSize?: number; title?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, status, sortDir]);

  const { data, isLoading, isError, refetch, isFetching } = useMyRequests({ q: dq || undefined, status: status || undefined, sortBy: 'submittedAt', sortDir, page, pageSize });
  const filtered = !!dq || !!status;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input type="search" aria-label="Search my requests" placeholder="Search title, location, reference" value={q} onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm sm:w-64" />
          </div>
          <FilterSelect label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'REOPENED'] as const).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </FilterSelect>
        </div>
      </div>

      {isLoading ? <TableSkeleton /> : isError ? <ErrorState message="We couldn't load your requests." onRetry={() => refetch()} /> :
        data!.total === 0 ? (
          filtered ? <EmptyState title="No requests match your filters" message="Try a different search or clear the status filter." action={<Button variant="secondary" onClick={() => { setQ(''); setStatus(''); }}>Clear filters</Button>} />
            : <EmptyState title="You haven't reported anything yet" message="Spotted a pothole, a broken street light or a water problem? Report it and track the response here." icon={<ClipboardList className="size-6" />} action={<Button onClick={() => navigate('/requests/new')}><Plus className="size-4" />Report an Issue</Button>} />
        ) : (
          <>
            <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Reference</th><th className="px-3 py-3 font-semibold">Title</th><th className="px-3 py-3 font-semibold">Category</th><th className="px-3 py-3 font-semibold">Location</th>
                      <th className="px-3 py-3 font-semibold" aria-sort={sortDir === 'asc' ? 'ascending' : 'descending'}>
                        <button className="inline-flex items-center gap-1 uppercase" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} aria-label="Sort by date submitted">
                          Submitted {sortDir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                        </button>
                      </th>
                      <th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Updated</th><th className="px-5 py-3 font-semibold"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data!.items.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-semibold text-navy">{r.trackingReference}</td>
                        <td className="max-w-56 truncate px-3 py-3 font-medium" title={r.title}>{r.title}</td>
                        <td className="px-3 py-3 text-slate-600">{r.categoryName}</td>
                        <td className="max-w-40 truncate px-3 py-3 text-slate-600" title={r.location}>{r.location}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(r.submittedAt)}</td>
                        <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">{timeAgo(r.updatedAt)}</td>
                        <td className="px-5 py-3 text-right"><Link to={`/requests/${r.id}`} className="font-semibold text-brand hover:underline" aria-label={`View details for ${r.trackingReference}`}>View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <ul className="divide-y divide-line md:hidden">
                {data!.items.map((r) => (
                  <li key={r.id}>
                    <Link to={`/requests/${r.id}`} className="block space-y-1.5 px-5 py-4">
                      <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-navy">{r.trackingReference}</span><StatusBadge status={r.status} /></div>
                      <p className="font-medium text-slate-900">{r.title}</p>
                      <p className="text-xs text-muted">{r.categoryName} · {r.location}</p>
                      <p className="text-xs text-muted">Submitted {formatDate(r.submittedAt)} · Updated {timeAgo(r.updatedAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <Pagination page={data!.page} totalPages={data!.totalPages} total={data!.total} pageSize={data!.pageSize} onChange={setPage} />
          </>
        )}
    </Card>
  );
}
