import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, History, Mail, MapPin, Phone, Tag, User } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, ErrorState, Skeleton } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { PriorityBadge, StatusBadge } from '../../components/ui/Badges';
import { SelectField, TextArea } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Timeline } from '../../components/Timeline';
import { useAdminActions, useAdminRequest, useDepartments, useStaff } from '../../features/admin/hooks';
import { ApiError } from '../../services/api';
import { formatDateTime, PRIORITY_LABEL, STATUS_LABEL } from '../../utils/format';
import type { Priority, RequestStatus } from '../../types';

// Mirrors server ADMIN_TRANSITIONS for UX only; the API is the source of truth and re-validates every change.
const NEXT: Record<RequestStatus, RequestStatus[]> = {
  PENDING: ['IN_PROGRESS', 'REJECTED'], IN_PROGRESS: ['RESOLVED', 'REJECTED'], REOPENED: ['IN_PROGRESS', 'REJECTED'], RESOLVED: [], REJECTED: [],
};
const ACTION_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Pending', IN_PROGRESS: 'Start work (In Progress)', RESOLVED: 'Mark as Resolved', REJECTED: 'Reject / close', REOPENED: 'Reopened',
};
const msg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export default function AdminRequestDetailPage() {
  const { id = '' } = useParams();
  const { data: r, isLoading, isError, error, refetch } = useAdminRequest(id);
  const { changeStatus, assign, addNote } = useAdminActions(id);
  const departments = useDepartments();
  const staff = useStaff();

  const [target, setTarget] = useState<RequestStatus | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [statusError, setStatusError] = useState('');
  const [note, setNote] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'INTERNAL'>('INTERNAL');

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-72" /></div>;
  if (isError || !r) {
    const nf = error instanceof ApiError && error.status === 404;
    return <Card><ErrorState message={nf ? 'That request does not exist.' : "We couldn't load this request."} onRetry={nf ? undefined : () => refetch()} /></Card>;
  }

  const confirmStatus = () => {
    if (!target) return;
    const text = statusComment.trim();
    if (target === 'RESOLVED' && !text) { setStatusError('A resolution comment is required to resolve a request.'); return; }
    if (target === 'REJECTED' && !text) { setStatusError('Please give the citizen a reason for closing this request.'); return; }
    changeStatus.mutate(
      { status: target, ...(target === 'RESOLVED' ? { resolutionComment: text } : { comment: text || undefined }) },
      {
        onSuccess: () => { toast.success(`Status changed to ${STATUS_LABEL[target]}`); setTarget(null); setStatusComment(''); setStatusError(''); },
        onError: (e) => setStatusError(msg(e, 'Could not change status')),
      },
    );
  };

  const submitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    addNote.mutate({ body: note.trim(), visibility }, {
      onSuccess: () => { setNote(''); toast.success(visibility === 'PUBLIC' ? 'Public update posted and citizen notified' : 'Internal note saved'); },
      onError: (er) => toast.error(msg(er, 'Could not save note')),
    });
  };

  const nextStates = NEXT[r.status];

  return (
    <div className="space-y-6">
      <Link to="/admin/requests" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-navy"><ArrowLeft className="size-4" />Back to requests</Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-muted">{r.trackingReference}</p>
                <h1 className="mt-1 break-words text-2xl font-bold text-navy">{r.title}</h1>
              </div>
              <div className="flex items-center gap-2"><PriorityBadge priority={r.priority} /><StatusBadge status={r.status} /></div>
            </div>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-1.5"><Tag className="size-4 text-muted" aria-hidden /><dt className="sr-only">Category</dt><dd>{r.categoryName}</dd></div>
              <div className="flex items-center gap-1.5"><MapPin className="size-4 text-muted" aria-hidden /><dt className="sr-only">Location</dt><dd>{r.location}</dd></div>
              <div className="flex items-center gap-1.5"><Building2 className="size-4 text-muted" aria-hidden /><dt className="sr-only">Department</dt><dd>{r.departmentName ?? 'Unassigned'}</dd></div>
            </dl>
            <p className="mt-5 whitespace-pre-wrap break-words text-slate-800">{r.description}</p>
            {r.imageUrl && <a href={r.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block"><img src={r.imageUrl} alt={`Evidence photo for ${r.trackingReference}`} loading="lazy" className="max-h-96 rounded-lg border border-line object-cover" /></a>}
            {r.latitude && r.longitude && <p className="mt-3 text-xs text-muted">Coordinates: {r.latitude}, {r.longitude}</p>}
            <p className="mt-4 text-xs text-muted">Submitted {formatDateTime(r.submittedAt)} · Last updated {formatDateTime(r.updatedAt)}</p>
            {r.resolutionComment && <div className="mt-4 rounded-lg bg-resolved-soft p-3 text-sm"><strong className="text-resolved">Resolution: </strong>{r.resolutionComment}</div>}
          </Card>

          <Card>
            <CardHeader title="Change status" subtitle="Valid next steps are determined by the workflow: Pending → In Progress → Resolved" />
            <div className="p-5">
              {nextStates.length === 0 ? (
                <p className="text-sm text-muted">{r.status === 'RESOLVED' ? 'This request is resolved. Only the citizen can reopen it (within 14 days).' : 'This request is closed and cannot change status.'}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nextStates.map((s) => <Button key={s} variant={s === 'REJECTED' ? 'danger' : s === 'RESOLVED' ? 'primary' : 'navy'} onClick={() => { setTarget(s); setStatusComment(''); setStatusError(''); }}>{ACTION_LABEL[s]}</Button>)}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Add an update" subtitle="Choose who can see it" />
            <form onSubmit={submitNote} className="space-y-3 p-5">
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-slate-800">Visibility</legend>
                <div className="flex flex-wrap gap-3 text-sm">
                  <label className="flex items-center gap-2"><input type="radio" name="vis" checked={visibility === 'INTERNAL'} onChange={() => setVisibility('INTERNAL')} />Internal note <span className="text-xs text-muted">(staff only)</span></label>
                  <label className="flex items-center gap-2"><input type="radio" name="vis" checked={visibility === 'PUBLIC'} onChange={() => setVisibility('PUBLIC')} />Public update <span className="text-xs text-muted">(citizen sees it and is notified)</span></label>
                </div>
              </fieldset>
              <TextArea label={visibility === 'INTERNAL' ? 'Internal note' : 'Message to citizen'} rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit" disabled={!note.trim()} loading={addNote.isPending}>{visibility === 'INTERNAL' ? 'Save internal note' : 'Post public update'}</Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Audit trail" subtitle="Administrative actions on this request" />
            {r.audit.length === 0 ? <p className="p-5 text-sm text-muted">No administrative actions recorded yet.</p> : (
              <ul className="divide-y divide-line">
                {r.audit.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                    <History className="size-4 text-muted" aria-hidden />
                    <span className="font-mono text-xs font-semibold text-navy">{a.action}</span>
                    <span className="text-slate-600">{a.actorName ?? 'System'}</span>
                    {a.metadata && <code className="max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600" title={JSON.stringify(a.metadata)}>{JSON.stringify(a.metadata)}</code>}
                    <time className="ml-auto text-xs text-muted" dateTime={a.createdAt}>{formatDateTime(a.createdAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Citizen" subtitle="Shown to administrators only" />
            <ul className="space-y-2 p-5 text-sm">
              <li className="flex items-center gap-2"><User className="size-4 text-muted" aria-hidden />{r.citizen.name}</li>
              <li className="flex items-center gap-2"><Mail className="size-4 text-muted" aria-hidden /><a className="break-all text-brand hover:underline" href={`mailto:${r.citizen.email}`}>{r.citizen.email}</a></li>
              {r.citizen.phone && <li className="flex items-center gap-2"><Phone className="size-4 text-muted" aria-hidden />{r.citizen.phone}</li>}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Assignment & priority" />
            <div className="space-y-4 p-5">
              <SelectField label="Department" value={r.assignedDepartmentId ?? ''} disabled={assign.isPending}
                onChange={(e) => assign.mutate({ departmentId: e.target.value || null }, { onSuccess: () => toast.success('Department updated'), onError: (er) => toast.error(msg(er, 'Could not assign')) })}>
                <option value="">Unassigned</option>
                {departments.data?.filter((d) => d.isActive || d.id === r.assignedDepartmentId).map((d) => <option key={d.id} value={d.id}>{d.name}{d.isActive ? '' : ' (inactive)'}</option>)}
              </SelectField>
              <SelectField label="Staff member" value={r.assignedStaffId ?? ''} disabled={assign.isPending}
                onChange={(e) => assign.mutate({ staffId: e.target.value || null }, { onSuccess: () => toast.success('Staff member updated'), onError: (er) => toast.error(msg(er, 'Could not assign')) })}>
                <option value="">Unassigned</option>
                {staff.data?.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </SelectField>
              <SelectField label="Priority" hint="Triage label only; it is not an automatic service-delivery guarantee." value={r.priority} disabled={assign.isPending}
                onChange={(e) => assign.mutate({ priority: e.target.value as Priority }, { onSuccess: () => toast.success('Priority updated'), onError: (er) => toast.error(msg(er, 'Could not update priority')) })}>
                {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </SelectField>
            </div>
          </Card>

          <Card>
            <CardHeader title="Timeline" subtitle="Includes internal notes (dashed)" />
            <div className="p-5"><Timeline history={r.history} comments={r.comments} /></div>
          </Card>
        </div>
      </div>

      <ConfirmDialog open={!!target} danger={target === 'REJECTED'} loading={changeStatus.isPending}
        title={target ? `${ACTION_LABEL[target].replace(' (In Progress)', '')}?` : ''} confirmLabel="Confirm change"
        onCancel={() => { setTarget(null); setStatusError(''); }} onConfirm={confirmStatus}>
        <p>{target === 'RESOLVED' ? 'Describe what was done. This resolution comment is shown to the citizen.' : target === 'REJECTED' ? 'Explain why this request is being closed. The citizen will see this.' : 'Optionally add a note for the citizen. They will be notified of the change.'}</p>
        <textarea aria-label={target === 'RESOLVED' ? 'Resolution comment' : 'Comment'} rows={3} value={statusComment} onChange={(e) => setStatusComment(e.target.value)} maxLength={2000} className="mt-3 w-full rounded-lg border border-line p-2 text-sm" />
        {statusError && <p role="alert" className="mt-1 text-xs text-rejected">{statusError}</p>}
      </ConfirmDialog>
    </div>
  );
}
