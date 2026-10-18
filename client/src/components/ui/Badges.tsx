import clsx from 'clsx';
import { AlertCircle, CheckCircle2, CircleDot, Clock, RotateCcw, XCircle } from 'lucide-react';
import type { Priority, RequestStatus } from '../../types';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../utils/format';

const styles: Record<RequestStatus, { cls: string; Icon: typeof Clock }> = {
  PENDING: { cls: 'bg-pending-soft text-pending', Icon: Clock },
  IN_PROGRESS: { cls: 'bg-progress-soft text-progress', Icon: CircleDot },
  RESOLVED: { cls: 'bg-resolved-soft text-resolved', Icon: CheckCircle2 },
  REJECTED: { cls: 'bg-rejected-soft text-rejected', Icon: XCircle },
  REOPENED: { cls: 'bg-pending-soft text-pending', Icon: RotateCcw },
};

// Icon + text so status never relies on colour alone.
export function StatusBadge({ status }: { status: RequestStatus }) {
  const { cls, Icon } = styles[status];
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', cls)}>
      <Icon className="size-3.5" aria-hidden />{STATUS_LABEL[status]}
    </span>
  );
}

const prio: Record<Priority, string> = {
  LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-sky-50 text-sky-700', HIGH: 'bg-orange-50 text-orange-700', URGENT: 'bg-rejected-soft text-rejected',
};
export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', prio[priority])}>
      {priority === 'URGENT' && <AlertCircle className="size-3" aria-hidden />}{PRIORITY_LABEL[priority]}
    </span>
  );
}
