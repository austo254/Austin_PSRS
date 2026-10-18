import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Pencil, RotateCcw, Tag, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Card, CardHeader, ErrorState, Skeleton } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badges';
import { TextArea, TextField } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Timeline } from '../../components/Timeline';
import { useInvalidateCitizen, useRequest, useRequestComments, useRequestHistory } from '../../features/requests/hooks';
import { api, ApiError } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { requestSchema } from '../../schemas/request';

const editSchema = requestSchema.pick({ title: true, location: true, description: true });
const REOPEN_WINDOW_DAYS = 14;

export default function RequestDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const invalidate = useInvalidateCitizen();
  const req = useRequest(id);
  const history = useRequestHistory(id);
  const comments = useRequestComments(id);
  const [editing, setEditing] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [comment, setComment] = useState('');

  const refresh = async () => { await invalidate(); await qc.invalidateQueries({ queryKey: ['request', id] }); };
  const addComment = useMutation({
    mutationFn: (body: string) => api(`/requests/${id}/comments`, { method: 'POST', body: { body } }),
    onSuccess: async () => { setComment(''); await refresh(); toast.success('Comment added'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add comment'),
  });
  const reopen = useMutation({
    mutationFn: (r: string) => api(`/requests/${id}/reopen`, { method: 'POST', body: { reason: r } }),
    onSuccess: async () => { setReopenOpen(false); setReason(''); await refresh(); toast.success('Request reopened'); },
    onError: (e) => setReasonError(e instanceof ApiError ? e.message : 'Could not reopen'),
  });
  const edit = useForm({ resolver: zodResolver(editSchema) });
  const save = useMutation({
    mutationFn: (b: z.infer<typeof editSchema>) => api(`/requests/${id}`, { method: 'PATCH', body: b }),
    onSuccess: async () => { setEditing(false); await refresh(); toast.success('Request updated'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save changes'),
  });

  if (req.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-64" /></div>;
  if (req.isError || !req.data) {
    const notFound = req.error instanceof ApiError && req.error.status === 404;
    return <Card><ErrorState message={notFound ? "We couldn't find that request. It may not exist, or it belongs to another account." : "We couldn't load this request."} onRetry={notFound ? undefined : () => req.refetch()} /></Card>;
  }
  const r = req.data;
  const withinWindow = r.status === 'RESOLVED' && r.resolvedAt && Date.now() - new Date(r.resolvedAt).getTime() <= REOPEN_WINDOW_DAYS * 86_400_000;

  return (
    <div className="space-y-6">
      <Link to="/requests" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-navy"><ArrowLeft className="size-4" />Back to my requests</Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-muted">{r.trackingReference}</p>
                <h1 className="mt-1 break-words text-2xl font-bold text-navy">{r.title}</h1>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-1.5"><Tag className="size-4 text-muted" aria-hidden /><dt className="sr-only">Category</dt><dd>{r.categoryName}</dd></div>
              <div className="flex items-center gap-1.5"><MapPin className="size-4 text-muted" aria-hidden /><dt className="sr-only">Location</dt><dd>{r.location}</dd></div>
              {r.departmentName && <div className="flex items-center gap-1.5"><Building2 className="size-4 text-muted" aria-hidden /><dt className="sr-only">Assigned to</dt><dd>{r.departmentName}</dd></div>}
            </dl>

            {editing ? (
              <form onSubmit={edit.handleSubmit((v) => save.mutate(v))} noValidate className="mt-5 space-y-4">
                <TextField label="Title" required error={edit.formState.errors.title?.message as string} {...edit.register('title')} />
                <TextField label="Location" required error={edit.formState.errors.location?.message as string} {...edit.register('location')} />
                <TextArea label="Description" required rows={5} error={edit.formState.errors.description?.message as string} {...edit.register('description')} />
                <div className="flex gap-2"><Button type="submit" loading={save.isPending}>Save changes</Button><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button></div>
              </form>
            ) : (
              <>
                <p className="mt-5 whitespace-pre-wrap break-words text-slate-800">{r.description}</p>
                {r.imageUrl && <a href={r.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block"><img src={r.imageUrl} alt={`Evidence photo for ${r.trackingReference}`} loading="lazy" className="max-h-80 rounded-lg border border-line object-cover" /></a>}
                {r.canEdit && <Button variant="secondary" size="sm" className="mt-4" onClick={() => { edit.reset({ title: r.title, location: r.location, description: r.description }); setEditing(true); }}><Pencil className="size-4" />Edit details</Button>}
              </>
            )}
          </Card>

          {r.status === 'RESOLVED' && r.resolutionComment && (
            <Card className="border-resolved/40 bg-resolved-soft/60 p-5">
              <h2 className="font-semibold text-resolved">Resolution</h2>
              <p className="mt-1 text-sm text-slate-800">{r.resolutionComment}</p>
              {r.resolvedAt && <p className="mt-1 text-xs text-muted">Resolved {formatDateTime(r.resolvedAt)}</p>}
              {withinWindow ? <Button variant="secondary" size="sm" className="mt-3" onClick={() => setReopenOpen(true)}><RotateCcw className="size-4" />This isn't fixed — reopen</Button>
                : <p className="mt-2 text-xs text-muted">The {REOPEN_WINDOW_DAYS}-day reopening window has passed. Please submit a new request if the issue persists.</p>}
            </Card>
          )}

          <Card>
            <CardHeader title="Add a comment" subtitle="Visible to you and the staff handling this request" />
            <form className="space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); if (comment.trim()) addComment.mutate(comment.trim()); }}>
              <TextArea label="Your comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button type="submit" disabled={!comment.trim()} loading={addComment.isPending}>Post comment</Button>
            </form>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Progress timeline" />
          <div className="p-5">
            {history.isLoading || comments.isLoading ? <Skeleton className="h-40" />
              : history.isError || comments.isError ? <ErrorState message="Couldn't load the timeline." onRetry={() => { history.refetch(); comments.refetch(); }} />
                : <Timeline history={history.data ?? []} comments={comments.data ?? []} />}
          </div>
        </Card>
      </div>

      <ConfirmDialog open={reopenOpen} title="Reopen this request?" confirmLabel="Reopen request" loading={reopen.isPending}
        onCancel={() => { setReopenOpen(false); setReasonError(''); }}
        onConfirm={() => { if (reason.trim().length < 5) { setReasonError('Please explain why (at least 5 characters)'); return; } setReasonError(''); reopen.mutate(reason.trim()); }}>
        <p>Tell staff what is still wrong so they can review it again.</p>
        <textarea aria-label="Reason for reopening" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-3 w-full rounded-lg border border-line p-2 text-sm" />
        {reasonError && <p role="alert" className="mt-1 text-xs text-rejected">{reasonError}</p>}
      </ConfirmDialog>
    </div>
  );
}
