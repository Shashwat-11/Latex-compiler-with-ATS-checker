import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const projectSettings = pgTable('project_settings', {
  projectId: uuid('project_id')
    .primaryKey()
    .references(() => projects.id, { onDelete: 'cascade' }),
  compiler: text('compiler').notNull().default('pdflatex'),
  rootFileId: uuid('root_file_id'),
  spellCheckLang: text('spell_check_lang').default('en-US'),
  editorFontSize: integer('editor_font_size').default(14),
  autoCompile: boolean('auto_compile').notNull().default(true),
  compileOnSave: boolean('compile_on_save').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProjectSettings = typeof projectSettings.$inferSelect;
export type NewProjectSettings = typeof projectSettings.$inferInsert;
