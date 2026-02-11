import { mysqlTable, int, varchar, text, datetime, boolean, mysqlEnum, json, unique } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const applicants = mysqlTable('applicants', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  businessPlanUrl: text('business_plan_url'),
  status: mysqlEnum('status', ['pending', 'video_submitted', 'evaluated', 'accepted', 'rejected']).notNull().default('pending'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const questions = mysqlTable('questions', {
  id: int('id').primaryKey().autoincrement(),
  questionText: text('question_text').notNull(),
  orderNumber: int('order_number').notNull().unique(),
  isRequired: boolean('is_required').notNull().default(true),
  maxDurationSeconds: int('max_duration_seconds').notNull().default(180),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const videoAnswers = mysqlTable('video_answers', {
  id: int('id').primaryKey().autoincrement(),
  applicantId: int('applicant_id').notNull().references(() => applicants.id, { onDelete: 'cascade' }),
  questionId: int('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  videoUrl: text('video_url').notNull(),
  transcription: text('transcription'),
  transcriptionStatus: mysqlEnum('transcription_status', ['pending', 'processing', 'completed', 'failed']).notNull().default('pending'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqApplicantQuestion: unique().on(table.applicantId, table.questionId),
}));

export const evaluations = mysqlTable('evaluations', {
  id: int('id').primaryKey().autoincrement(),
  applicantId: int('applicant_id').notNull().unique().references(() => applicants.id, { onDelete: 'cascade' }),
  totalScore: int('total_score'),
  detailedScores: json('detailed_scores'),
  aiComment: text('ai_comment'),
  evaluationStatus: mysqlEnum('evaluation_status', ['pending', 'processing', 'completed', 'failed']).notNull().default('pending'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const adminUsers = mysqlTable('admin_users', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Type exports
export type Applicant = typeof applicants.$inferSelect;
export type NewApplicant = typeof applicants.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type VideoAnswer = typeof videoAnswers.$inferSelect;
export type NewVideoAnswer = typeof videoAnswers.$inferInsert;
export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
