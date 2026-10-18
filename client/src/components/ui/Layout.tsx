import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from './Button';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('rounded-card border border-line bg-white shadow-card', className)} {...rest} />;
}
export function CardHeader({ title, action, subtitle }: { title: string; action?: ReactNode; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div><h2 className="text-base font-semibold text-navy">{title}</h2>{subtitle && <p className="text-xs text-muted">{subtitle}</p>}</div>
      {action}
    </div>
  );
}
export const Skeleton = ({ className }: { className?: string }) => <div className={clsx('skeleton', className)} aria-hidden />;

export function EmptyState({ title, message, action, icon }: { title: string; message?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-brand-soft text-brand">{icon ?? <Inbox className="size-6" aria-hidden />}</div>
      <p className="font-semibold text-navy">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertTriangle className="size-8 text-rejected" aria-hidden />
      <p className="text-sm text-slate-700">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-navy">{title}</h1>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>
      {actions}
    </div>
  );
}
