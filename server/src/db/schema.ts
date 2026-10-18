import {
  pgTable, pgEnum, pgSequence, uuid, text, varchar, boolean, timestamp, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---- Enums (values are the single source of truth; see src/constants.ts) ----
export const userRole = pgEnum('user_role', ['CITIZEN', 'ADMIN']);
export const requestStatus = pgEnum('request_status', ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'REOPENED']);
export const requestPriority = pgEnum('request_priority', ['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const commentVisibility = pgEnum('comment_visibility', ['PUBLIC', 'INTERNAL']);

/** Concurrency-safe source for human-readable tracking references (PSRS-YYYY-000123). */
export const trackingSeq = pgSequence('request_tracking_seq', { startWith: 1, increment: 1 });

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: varchar('full_name', { length: 120 }).notNull(),
  email: varchar('email', { length: 254 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 30 }),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('CITIZEN'),
  isDemo: boolean('is_demo').notNull().default(false), // distinguishes seed data from real records
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('users_email_unique').on(t.email), index('users_role_idx').on(t.role)]);

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // SHA-256 of the cookie token; raw token is never stored
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  csrfToken: text('csrf_token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)]);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('prt_token_unique').on(t.tokenHash)]);

export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull().default(''),
  iconKey: varchar('icon_key', { length: 40 }).notNull().default('circle-help'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('categories_name_unique').on(t.name)]);

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description').notNull().default(''),
  contactEmail: varchar('contact_email', { length: 254 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('departments_name_unique').on(t.name)]);

export const serviceRequests = pgTable('service_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackingReference: varchar('tracking_reference', { length: 24 }).notNull(),
  citizenId: uuid('citizen_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  categoryId: uuid('category_id').notNull().references(() => serviceCategories.id, { onDelete: 'restrict' }),
  assignedDepartmentId: uuid('assigned_department_id').references(() => departments.id, { onDelete: 'set null' }),
  assignedStaffId: uuid('assigned_staff_id').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 150 }).notNull(),
  description: text('description').notNull(),
  location: varchar('location', { length: 200 }).notNull(),
  latitude: text('latitude'),
  longitude: text('longitude'),
  imageUrl: text('image_url'),
  status: requestStatus('status').notNull().default('PENDING'),
  priority: requestPriority('priority').notNull().default('MEDIUM'),
  resolutionComment: text('resolution_comment'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('requests_tracking_unique').on(t.trackingReference),
  index('requests_citizen_idx').on(t.citizenId, t.submittedAt),
  index('requests_status_idx').on(t.status),
  index('requests_category_idx').on(t.categoryId),
  index('requests_department_idx').on(t.assignedDepartmentId),
  index('requests_submitted_idx').on(t.submittedAt),
]);

export const requestStatusHistory = pgTable('request_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull().references(() => serviceRequests.id, { onDelete: 'cascade' }),
  previousStatus: requestStatus('previous_status'),
  newStatus: requestStatus('new_status').notNull(),
  changedById: uuid('changed_by_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('history_request_idx').on(t.requestId, t.createdAt)]);

export const requestComments = pgTable('request_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull().references(() => serviceRequests.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  body: text('body').notNull(),
  visibility: commentVisibility('visibility').notNull().default('PUBLIC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('comments_request_idx').on(t.requestId, t.createdAt)]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id').references(() => serviceRequests.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 150 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('notifications_user_idx').on(t.userId, t.isRead, t.createdAt)]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 80 }).notNull(),
  entityType: varchar('entity_type', { length: 40 }).notNull(),
  entityId: text('entity_id').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('audit_entity_idx').on(t.entityType, t.entityId), index('audit_created_idx').on(t.createdAt)]);

// ---- Relations (for relational queries) ----
export const requestRelations = relations(serviceRequests, ({ one, many }) => ({
  citizen: one(users, { fields: [serviceRequests.citizenId], references: [users.id], relationName: 'citizen' }),
  assignedStaff: one(users, { fields: [serviceRequests.assignedStaffId], references: [users.id], relationName: 'staff' }),
  category: one(serviceCategories, { fields: [serviceRequests.categoryId], references: [serviceCategories.id] }),
  department: one(departments, { fields: [serviceRequests.assignedDepartmentId], references: [departments.id] }),
  history: many(requestStatusHistory),
  comments: many(requestComments),
}));

export const historyRelations = relations(requestStatusHistory, ({ one }) => ({
  request: one(serviceRequests, { fields: [requestStatusHistory.requestId], references: [serviceRequests.id] }),
  changedBy: one(users, { fields: [requestStatusHistory.changedById], references: [users.id] }),
}));

export const commentRelations = relations(requestComments, ({ one }) => ({
  request: one(serviceRequests, { fields: [requestComments.requestId], references: [serviceRequests.id] }),
  author: one(users, { fields: [requestComments.authorId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
