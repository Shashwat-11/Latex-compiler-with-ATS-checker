import {
  pgTable,
  uuid,
  text,
  integer,
  pgEnum,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { users } from './users';

export const compilationStatusEnum = pgEnum('compilation_status', [
  'queued',
  'running',
  'compiling',
  'success',
  'error',
  'cancelled',
  'timeout',
]);

export const compilations = pgTable(
  'compilations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    initiatorId: uuid('initiator_id')
      .notNull()
      .references(() => users.id),
    status: compilationStatusEnum('status').notNull().default('queued'),
    compiler: text('compiler').notNull().default('pdflatex'),
    logOutput: text('log_output'),
    errorSummary: text('error_summary'),
    pdfPath: text('pdf_path'),
    pdfSizeBytes: integer('pdf_size_bytes'),
    compileTimeMs: integer('compile_time_ms'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_compilations_project_id').on(table.projectId),
    statusIdx: index('idx_compilations_status').on(table.status),
  }),
);

export type Compilation = typeof compilations.$inferSelect;
export type NewCompilation = typeof compilations.$inferInsert;
