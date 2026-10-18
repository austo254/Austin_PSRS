import type { RequestStatus, Priority } from '../types';

export const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Pending', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', REJECTED: 'Rejected', REOPENED: 'Reopened',
};
export const PRIORITY_LABEL: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };

const dateFmt = new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); if (d < 30) return `${d} d ago`;
  return formatDate(iso);
}

export function formatDuration(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;
export const initials = (full: string) => full.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
