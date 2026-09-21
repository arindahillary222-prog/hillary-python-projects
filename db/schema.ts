import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull(),
  createdAt: text('created_at').notNull()
}, t => [uniqueIndex('teams_invite_code').on(t.inviteCode)]);

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  teamId: text('team_id'),
  userId: text('user_id'),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  owner: integer('owner').notNull().default(0),
  active: integer('active').notNull().default(1),
  passwordHash: text('password_hash'),
  createdAt: text('created_at').notNull()
}, t => [uniqueIndex('members_user_id').on(t.userId), uniqueIndex('members_email').on(t.email)]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull()
}, t => [uniqueIndex('sessions_token_hash').on(t.tokenHash), index('sessions_member').on(t.memberId)]);

export const trackerData = sqliteTable('tracker_data', {
  memberId: text('member_id').primaryKey().references(() => members.id),
  data: text('data').notNull(),
  revision: integer('revision').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  assigneeId: text('assignee_id').notNull().references(() => members.id),
  createdBy: text('created_by').notNull().references(() => members.id),
  dueDate: text('due_date'),
  status: text('status').notNull().default('not_started'),
  progress: integer('progress').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, t => [index('tasks_assignee').on(t.assigneeId)]);

export const progressEntries = sqliteTable('progress_entries', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  date: text('date').notNull(),
  note: text('note').notNull(),
  percent: integer('percent'),
  createdAt: text('created_at').notNull()
}, t => [index('progress_member_date').on(t.memberId, t.date)]);
