import { CheckCircle2, CircleDot, Clock, MessageSquare, RotateCcw, XCircle } from 'lucide-react';
import clsx from 'clsx';
import type { CommentItem, HistoryItem, RequestStatus } from '../types';
import { formatDateTime, STATUS_LABEL } from '../utils/format';

type Entry =
  | { kind: 'status'; at: string; h: HistoryItem }
  | { kind: 'comment'; at: string; c: CommentItem };

const icon: Record<RequestStatus, { I: typeof Clock; cls: string }> = {
  PENDING: { I: Clock, cls: 'bg-pending-soft text-pending' }, IN_PROGRESS: { I: CircleDot, cls: 'bg-progress-soft text-progress' },
  RESOLVED: { I: CheckCircle2, cls: 'bg-resolved-soft text-resolved' }, REJECTED: { I: XCircle, cls: 'bg-rejected-soft text-rejected' },
  REOPENED: { I: RotateCcw, cls: 'bg-pending-soft text-pending' },
};

/** Chronological timeline of status changes and comments. Internal notes are styled distinctly (admin view only). */
export function Timeline({ history, comments }: { history: HistoryItem[]; comments: CommentItem[] }) {
  const entries: Entry[] = [
    ...history.map((h) => ({ kind: 'status' as const, at: h.createdAt, h })),
    ...comments.map((c) => ({ kind: 'comment' as const, at: c.createdAt, c })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <ol className="relative space-y-5 border-l-2 border-line pl-6" aria-label="Request timeline">
      {entries.map((e) => {
        if (e.kind === 'status') {
          const { I, cls } = icon[e.h.newStatus];
          const title = e.h.previousStatus === null ? 'Request submitted' : `Status changed to ${STATUS_LABEL[e.h.newStatus]}`;
          return (
            <li key={`h-${e.h.id}`} className="relative">
              <span className={clsx('absolute -left-[2.2rem] grid size-7 place-items-center rounded-full ring-4 ring-white', cls)}><I className="size-4" aria-hidden /></span>
              <p className="text-sm font-semibold text-navy">{title}</p>
              <p className="text-xs text-muted">{formatDateTime(e.h.createdAt)} · {e.h.changedByRole === 'ADMIN' ? `${e.h.changedByName} (staff)` : e.h.changedByName}</p>
              {e.h.comment && e.h.previousStatus !== null && <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{e.h.comment}</p>}
            </li>
          );
        }
        const internal = e.c.visibility === 'INTERNAL';
        return (
          <li key={`c-${e.c.id}`} className="relative">
            <span className={clsx('absolute -left-[2.2rem] grid size-7 place-items-center rounded-full ring-4 ring-white', internal ? 'bg-slate-200 text-slate-600' : 'bg-brand-soft text-brand')}><MessageSquare className="size-4" aria-hidden /></span>
            <p className="text-sm font-semibold text-navy">
              {e.c.authorRole === 'ADMIN' ? 'Staff update' : 'Comment from citizen'}
              {internal && <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Internal only</span>}
            </p>
            <p className="text-xs text-muted">{formatDateTime(e.c.createdAt)} · {e.c.authorName}</p>
            <p className={clsx('mt-1 whitespace-pre-wrap rounded-lg px-3 py-2 text-sm', internal ? 'border border-dashed border-slate-400 bg-slate-50 text-slate-700' : 'bg-brand-soft/60 text-slate-800')}>{e.c.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
