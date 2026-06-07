import {
  pgTable,
  uuid,
  text,
  integer,
  pgEnum,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const fileTypeEnum = pgEnum('file_type', ['file', 'folder']);

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): any => files.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    type: fileTypeEnum('type').notNull().default('file'),
    content: text('content').default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    contentHash: text('content_hash'),
    sizeBytes: integer('size_bytes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_files_project_id').on(table.projectId),
    parentIdIdx: index('idx_files_parent_id').on(table.parentId),
    uniqueNamePerFolder: uniqueIndex('uq_files_project_parent_name').on(
      table.projectId,
      table.parentId,
      table.name,
    ),
  }),
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
