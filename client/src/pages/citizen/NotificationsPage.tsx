import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, ErrorState, PageHeader, Skeleton } from '../../components/ui/Layout';
import { Button } from '../../components/ui/Button';
import { NotificationList } from '../../components/NotificationList';
import { useNotificationActions, useNotifications } from '../../features/notifications/hooks';

export default function NotificationsPage({ admin }: { admin?: boolean }) {
  const { data, isLoading, isError, refetch } = useNotifications(100);
  const { markAll } = useNotificationActions();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" description={data ? `${data.unreadCount} unread` : undefined}
        actions={<Button variant="secondary" disabled={!data?.unreadCount} loading={markAll.isPending} onClick={() => markAll.mutate(undefined, { onSuccess: () => toast.success('All notifications marked as read') })}><CheckCheck className="size-4" />Mark all as read</Button>} />
      <Card>
        {isLoading ? <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          : isError ? <ErrorState message="We couldn't load your notifications." onRetry={() => refetch()} />
            : <NotificationList items={data!.items} admin={admin} />}
      </Card>
    </div>
  );
}
