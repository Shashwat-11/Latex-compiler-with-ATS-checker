import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const resumeTemplates = pgTable('resume_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  category: text('category').notNull().default('professional'),
  latexClass: text('latex_class').notNull(),
  compiler: text('compiler').notNull().default('pdflatex'),
  styleOptions: jsonb('style_options').notNull().default({}),
  templateFiles: jsonb('template_files').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ResumeTemplate = typeof resumeTemplates.$inferSelect;
export type NewResumeTemplate = typeof resumeTemplates.$inferInsert;
