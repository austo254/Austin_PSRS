import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { AdminOverview, AdminRequestDetail, Category, Department, Paged, Priority, RequestRow, RequestStatus } from '../../types';
import type { ListParams } from '../requests/hooks';

export const useOverview = () => useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api<AdminOverview>('/admin/analytics/overview') });
export const useByCategory = () => useQuery({ queryKey: ['admin', 'by-category'], queryFn: () => api<{ items: { categoryId: string; name: string; count: number }[] }>('/admin/analytics/by-category').then((r) => r.items) });
export const useByStatus = () => useQuery({ queryKey: ['admin', 'by-status'], queryFn: () => api<{ items: { status: RequestStatus; count: number }[] }>('/admin/analytics/by-status').then((r) => r.items) });
export const useTrends = (days: number) => useQuery({
  queryKey: ['admin', 'trends', days],
  queryFn: () => api<{ submittedOverTime: { date: string; count: number }[]; monthlyResolution: { month: string; submitted: number; resolved: number }[] }>('/admin/analytics/trends', { query: { days } }),
});
export const useAdminRequests = (params: ListParams) => useQuery({
  queryKey: ['admin', 'requests', params], queryFn: () => api<Paged<RequestRow>>('/admin/requests', { query: params }), placeholderData: keepPreviousData,
});
export const useAdminRequest = (id: string) => useQuery({ queryKey: ['admin', 'request', id], queryFn: () => api<AdminRequestDetail>(`/admin/requests/${id}`) });
export const useDepartments = () => useQuery({ queryKey: ['admin', 'departments'], queryFn: () => api<{ items: Department[] }>('/admin/departments').then((r) => r.items) });
export const useAdminCategories = () => useQuery({ queryKey: ['admin', 'categories'], queryFn: () => api<{ items: Category[] }>('/admin/categories').then((r) => r.items) });
export const useStaff = () => useQuery({ queryKey: ['admin', 'staff'], queryFn: () => api<{ items: { id: string; fullName: string }[] }>('/admin/staff').then((r) => r.items) });

/** Any admin write can change dashboard numbers, lists and details, so refresh the whole admin cache. */
function useAdminInvalidate() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['admin'] }), qc.invalidateQueries({ queryKey: ['notifications'] })]);
}

export function useAdminActions(id: string) {
  const done = useAdminInvalidate();
  return {
    changeStatus: useMutation({
      mutationFn: (b: { status: RequestStatus; comment?: string; resolutionComment?: string }) => api<AdminRequestDetail>(`/admin/requests/${id}/status`, { method: 'PATCH', body: b }),
      onSuccess: done,
    }),
    assign: useMutation({
      mutationFn: (b: { departmentId?: string | null; staffId?: string | null; priority?: Priority }) => api<AdminRequestDetail>(`/admin/requests/${id}/assignment`, { method: 'PATCH', body: b }),
      onSuccess: done,
    }),
    addNote: useMutation({
      mutationFn: (b: { body: string; visibility: 'PUBLIC' | 'INTERNAL' }) => api<AdminRequestDetail>(`/admin/requests/${id}/notes`, { method: 'POST', body: b }),
      onSuccess: done,
    }),
  };
}

export function useSaveCatalog(kind: 'categories' | 'departments') {
  const done = useAdminInvalidate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string } & Record<string, unknown>) =>
      api(`/admin/${kind}${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: async () => { await done(); if (kind === 'categories') qc.invalidateQueries({ queryKey: ['categories'] }); },
  });
}
