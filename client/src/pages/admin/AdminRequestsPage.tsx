import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, EmptyState, ErrorState, PageHeader } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { FilterSelect } from '../../components/ui/Field';
import { PriorityBadge, StatusBadge } from '../../components/ui/Badges';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeletons';
import { useAdminRequests, useAdminCategories, useDepartments } from '../../features/admin/hooks';
import { useDebounced } from '../../hooks/useDebounced';
import { downloadFile } from '../../services/api';
import { formatDate, PRIORITY_LABEL, STATUS_LABEL } from '../../utils/format';

type SortKey = 'submittedAt' | 'updatedAt' | 'status' | 'title' | 'trackingReference' | 'priority';
const dateInput = 'h-10 rounded-lg border border-line bg-white px-3 text-sm hover:border-slate-400';

/** Request management table: every filter and the sort/pagination run on the server. */
export default function AdminRequestsPage() {
  const [q, setQ] = useState('');
  const [f, setF] = useState({ status: '', priority: '', categoryId: '', departmentId: '', from: '', to: '' });
  const [sortBy, setSortBy] = useState<SortKey>('submittedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, f, sortBy, sortDir]);

  const categories = useAdminCategories();
  const departments = useDepartments();
  const params = {
    q: dq || undefined, status: f.status || undefined, priority: f.priority || undefined, categoryId: f.categoryId || undefined,
    departmentId: f.departmentId || undefined, from: f.from || undefined, to: f.to || undefined, sortBy, sortDir,
  };
  const { data, isLoading, isError, refetch, isFetching } = useAdminRequests({ ...params, page, pageSize: 10 });
  const filtered = Object.values(params).some((v, i) => v !== undefined && i < 7);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const clear = () => { setQ(''); setF({ status: '', priority: '', categoryId: '', departmentId: '', from: '', to: '' }); };

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortBy(key); setSortDir('asc'); }
  };
  const SortHead = ({ k, children }: { k: SortKey; children: string }) => (
    <th scope="col" className="px-3 py-3 font-semibold" aria-sort={sortBy === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className="inline-flex items-center gap-1 uppercase tracking-wide" onClick={() => toggleSort(k)}>
        {children}{sortBy === k ? (sortDir === 'asc' ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />) : <ArrowUpDown className="size-3 opacity-40" aria-hidden />}
      </button>
    </th>
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      // Exports the *filtered* set (not just the current page); pagination params are ignored server-side.
      await downloadFile('/admin/requests/export', { ...params, page: 1, pageSize: 100 }, `psrs-requests-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('CSV export downloaded');
    } catch { toast.error('Export failed. Please try again.'); } finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader title="Service requests" description="Search, filter and manage every request submitted by citizens."
        actions={<Button variant="secondary" onClick={exportCsv} loading={exporting}><Download className="size-4" />Export CSV</Button>} />
      <Card>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input type="search" aria-label="Search requests" placeholder="Search reference, title, location, citizen name or email" value={q} onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm" />
          </div>
          <FilterSelect label="Filter by status" value={f.status} onChange={set('status')}>
            <option value="">All statuses</option>{(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </FilterSelect>
          <FilterSelect label="Filter by priority" value={f.priority} onChange={set('priority')}>
            <option value="">All priorities</option>{(Object.keys(PRIORITY_LABEL) as (keyof typeof PRIORITY_LABEL)[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </FilterSelect>
          <FilterSelect label="Filter by category" value={f.categoryId} onChange={set('categoryId')}>
            <option value="">All categories</option>{categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Filter by department" value={f.departmentId} onChange={set('departmentId')}>
            <option value="">All departments</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </FilterSelect>
          <label className="flex items-center gap-2 text-sm text-muted">From <input type="date" aria-label="Submitted from" className={dateInput} value={f.from} max={f.to || undefined} onChange={set('from')} /></label>
          <label className="flex items-center gap-2 text-sm text-muted">To <input type="date" aria-label="Submitted to" className={dateInput} value={f.to} min={f.from || undefined} onChange={set('to')} /></label>
        </div>

        {isLoading ? <TableSkeleton rows={8} /> : isError ? <ErrorState message="We couldn't load the requests." onRetry={() => refetch()} /> :
          data!.total === 0 ? (
            <EmptyState title={filtered ? 'No requests match your filters' : 'No requests yet'} message={filtered ? 'Try widening the date range or clearing a filter.' : 'Requests submitted by citizens will appear here.'}
              action={filtered ? <Button variant="secondary" onClick={clear}>Clear filters</Button> : undefined} />
          ) : (
            <>
              <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <SortHead k="trackingReference">Reference</SortHead><th scope="col" className="px-3 py-3 font-semibold">Citizen</th><th scope="col" className="px-3 py-3 font-semibold">Category</th>
                        <SortHead k="title">Title</SortHead><th scope="col" className="px-3 py-3 font-semibold">Location</th><SortHead k="submittedAt">Submitted</SortHead>
                        <SortHead k="status">Status</SortHead><SortHead k="priority">Priority</SortHead><th scope="col" className="px-3 py-3 font-semibold">Department</th><th scope="col" className="px-3 py-3 font-semibold">Staff</th>
                        <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {data!.items.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-navy">{r.trackingReference}</td>
                          <td className="px-3 py-3"><span className="block max-w-36 truncate" title={r.citizenEmail}>{r.citizenName}</span></td>
                          <td className="px-3 py-3 text-slate-600">{r.categoryName}</td>
                          <td className="max-w-48 truncate px-3 py-3 font-medium" title={r.title}>{r.title}</td>
                          <td className="max-w-36 truncate px-3 py-3 text-slate-600" title={r.location}>{r.location}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(r.submittedAt)}</td>
                          <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                          <td className="px-3 py-3"><PriorityBadge priority={r.priority} /></td>
                          <td className="px-3 py-3 text-slate-600">{r.departmentName ?? <span className="text-muted">Unassigned</span>}</td>
                          <td className="px-3 py-3 text-slate-600">{r.staffName ?? <span className="text-muted">—</span>}</td>
                          <td className="px-3 py-3 text-right"><Link to={`/admin/requests/${r.id}`} className="font-semibold text-brand hover:underline" aria-label={`Manage ${r.trackingReference}`}>Manage</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y divide-line lg:hidden">
                  {data!.items.map((r) => (
                    <li key={r.id}>
                      <Link to={`/admin/requests/${r.id}`} className="block space-y-1.5 px-4 py-4">
                        <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-navy">{r.trackingReference}</span><StatusBadge status={r.status} /></div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-muted">{r.citizenName} · {r.categoryName} · {r.location}</p>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted"><PriorityBadge priority={r.priority} />{r.departmentName ?? 'Unassigned'} · {formatDate(r.submittedAt)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <Pagination page={data!.page} totalPages={data!.totalPages} total={data!.total} pageSize={data!.pageSize} onChange={setPage} />
            </>
          )}
      </Card>
    </>
  );
}
