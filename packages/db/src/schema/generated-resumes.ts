import { pgTable, uuid, text, jsonb, pgEnum, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { resumeTemplates } from './resume-templates';
import { projects } from './projects';

export const generatedResumeStatusEnum = pgEnum('generated_resume_status', ['draft', 'compiling', 'done', 'error']);

export const generatedResumes = pgTable('generated_resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => resumeTemplates.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  inputData: jsonb('input_data').notNull(),
  status: generatedResumeStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_generated_resumes_user_id').on(table.userId),
  templateIdIdx: index('idx_generated_resumes_template_id').on(table.templateId),
}));

export type GeneratedResume = typeof generatedResumes.$inferSelect;
export type NewGeneratedResume = typeof generatedResumes.$inferInsert;
