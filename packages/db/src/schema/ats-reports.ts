import { pgTable, uuid, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { files } from './files';
import { compilations } from './compilations';

export const atsReports = pgTable('ats_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  compilationId: uuid('compilation_id').references(() => compilations.id),
  overallScore: integer('overall_score').notNull(),
  categoryScores: jsonb('category_scores').notNull(),
  keywordMatches: jsonb('keyword_matches').notNull(),
  missingKeywords: text('missing_keywords').array().notNull().default([]),
  formattingIssues: jsonb('formatting_issues').notNull().default([]),
  readabilityMetrics: jsonb('readability_metrics').notNull(),
  recommendations: text('recommendations').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  projectIdIdx: index('idx_ats_reports_project_id').on(table.projectId),
}));

export type AtsReport = typeof atsReports.$inferSelect;
export type NewAtsReport = typeof atsReports.$inferInsert;
