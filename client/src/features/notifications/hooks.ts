import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { NotificationItem } from '../../types';

export const useNotifications = (limit = 50) => useQuery({
  queryKey: ['notifications', limit],
  queryFn: () => api<{ items: NotificationItem[]; unreadCount: number }>('/notifications', { query: { limit } }),
  refetchInterval: 30_000, // light polling keeps the unread badge fresh without websockets
});

export function useNotificationActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  return {
    markRead: useMutation({ mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'PATCH' }), onSuccess: refresh }),
    markAll: useMutation({ mutationFn: () => api('/notifications/read-all', { method: 'POST' }), onSuccess: refresh }),
  };
}
