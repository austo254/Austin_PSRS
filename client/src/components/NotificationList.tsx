import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import clsx from 'clsx';
import type { NotificationItem } from '../types';
import { timeAgo } from '../utils/format';
import { EmptyState } from './ui/Layout';
import { useNotificationActions } from '../features/notifications/hooks';

export function NotificationList({ items, admin, compact }: { items: NotificationItem[]; admin?: boolean; compact?: boolean }) {
  const { markRead } = useNotificationActions();
  if (items.length === 0) return <EmptyState title="No notifications yet" message="Updates about your requests will appear here." icon={<Bell className="size-6" />} />;
  return (
    <ul className="divide-y divide-line">
      {items.map((n) => {
        const to = n.requestId ? (admin ? `/admin/requests/${n.requestId}` : `/requests/${n.requestId}`) : null;
        const body = (
          <div className="flex gap-3">
            <span className={clsx('mt-1.5 size-2.5 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-brand')} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={clsx('text-sm text-navy', !n.isRead && 'font-semibold')}>{n.title}{!n.isRead && <span className="sr-only"> (unread)</span>}</p>
              {!compact && <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>}
              <p className="mt-0.5 text-xs text-muted">{timeAgo(n.createdAt)}</p>
            </div>
          </div>
        );
        return (
          <li key={n.id} className={clsx('px-5 py-3', !n.isRead && 'bg-brand-soft/40')}>
            {to ? <Link to={to} onClick={() => !n.isRead && markRead.mutate(n.id)} className="block hover:opacity-90">{body}</Link> : body}
            {!compact && !n.isRead && <button onClick={() => markRead.mutate(n.id)} className="ml-5 mt-1 text-xs font-medium text-brand hover:underline">Mark as read</button>}
          </li>
        );
      })}
    </ul>
  );
}
