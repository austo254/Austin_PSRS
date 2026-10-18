export type Role = 'CITIZEN' | 'ADMIN';
export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'REOPENED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User { id: string; fullName: string; email: string; phoneNumber: string | null; role: Role; createdAt: string }
export interface Category { id: string; name: string; description: string; iconKey: string; isActive: boolean }
export interface Department { id: string; name: string; description: string; contactEmail: string | null; isActive: boolean }

export interface RequestRow {
  id: string; trackingReference: string; title: string; location: string; status: RequestStatus; priority: Priority;
  submittedAt: string; updatedAt: string; resolvedAt: string | null; categoryId: string; categoryName: string;
  departmentId: string | null; departmentName: string | null;
  citizenName?: string; citizenEmail?: string; staffId?: string | null; staffName?: string | null;
}
export interface Paged<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number }

export interface CitizenRequest {
  id: string; trackingReference: string; title: string; description: string; location: string; imageUrl: string | null;
  status: RequestStatus; priority: Priority; resolutionComment: string | null; submittedAt: string; updatedAt: string;
  resolvedAt: string | null; categoryId: string; categoryName: string; departmentName: string | null; canEdit: boolean;
  latitude: string | null; longitude: string | null;
}
export interface HistoryItem { id: string; previousStatus: RequestStatus | null; newStatus: RequestStatus; comment: string | null; createdAt: string; changedByName: string; changedByRole: Role }
export interface CommentItem { id: string; body: string; visibility: 'PUBLIC' | 'INTERNAL'; createdAt: string; authorName: string; authorRole: Role }
export interface NotificationItem { id: string; requestId: string | null; title: string; message: string; isRead: boolean; createdAt: string }

export interface CitizenSummary {
  total: number; pending: number; inProgress: number; resolved: number; rejected: number;
  recentActivity: { id: string; requestId: string; trackingReference: string; newStatus: RequestStatus; comment: string | null; createdAt: string }[];
}
export interface AdminOverview {
  total: number; pending: number; inProgress: number; resolved: number; rejected: number;
  resolutionRate: number; avgResolutionHours: number | null; avgOpenAgeDays: number | null;
}
export interface AdminRequestDetail extends Omit<CitizenRequest, 'canEdit'> {
  citizen: { name: string; email: string; phone: string | null }; staffName: string | null;
  assignedDepartmentId: string | null; assignedStaffId: string | null;
  history: HistoryItem[]; comments: CommentItem[]; audit: { id: string; action: string; metadata: Record<string, unknown> | null; createdAt: string; actorName: string | null }[];
}
export interface AppConfig { uploadsEnabled: boolean; uploadMaxBytes: number; passwordResetMode: 'disabled' | 'demo' }
