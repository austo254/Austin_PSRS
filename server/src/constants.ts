export const REQUEST_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'REOPENED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * Administrator-driven workflow. Citizens cannot change status except reopening a RESOLVED request.
 *   PENDING     -> IN_PROGRESS | REJECTED
 *   IN_PROGRESS -> RESOLVED (requires resolution comment) | REJECTED
 *   REOPENED    -> IN_PROGRESS | REJECTED
 *   RESOLVED    -> (citizen only) REOPENED
 *   REJECTED    -> terminal
 */
export const ADMIN_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  REOPENED: ['IN_PROGRESS', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
};

/** A resolved request can only be reopened within this many days of resolution. */
export const REOPEN_WINDOW_DAYS = 14;

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  REOPENED: 'Reopened',
};
