import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { AppConfig, Category, CitizenRequest, CitizenSummary, CommentItem, HistoryItem, Paged, RequestRow } from '../../types';

export type ListParams = Record<string, string | number | undefined>;

export const useConfig = () => useQuery({ queryKey: ['config'], queryFn: () => api<AppConfig>('/config'), staleTime: 5 * 60_000 });
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => api<{ items: Category[] }>('/categories').then((r) => r.items), staleTime: 60_000 });
export const useCitizenSummary = () => useQuery({ queryKey: ['summary'], queryFn: () => api<CitizenSummary>('/requests/summary') });
export const useMyRequests = (params: ListParams) => useQuery({
  queryKey: ['my-requests', params], queryFn: () => api<Paged<RequestRow>>('/requests', { query: params }), placeholderData: keepPreviousData,
});
export const useRequest = (id: string) => useQuery({ queryKey: ['request', id], queryFn: () => api<CitizenRequest>(`/requests/${id}`) });
export const useRequestHistory = (id: string) => useQuery({ queryKey: ['request', id, 'history'], queryFn: () => api<{ items: HistoryItem[] }>(`/requests/${id}/history`).then((r) => r.items) });
export const useRequestComments = (id: string) => useQuery({ queryKey: ['request', id, 'comments'], queryFn: () => api<{ items: CommentItem[] }>(`/requests/${id}/comments`).then((r) => r.items) });

/** Invalidate everything a citizen-side change can affect. */
export function useInvalidateCitizen() {
  const qc = useQueryClient();
  return () => Promise.all(['summary', 'my-requests', 'request', 'notifications'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function useCreateRequest() {
  const invalidate = useInvalidateCitizen();
  return useMutation({
    mutationFn: (form: FormData) => api<{ id: string; trackingReference: string; status: string }>('/requests', { method: 'POST', form }),
    onSuccess: invalidate,
  });
}
