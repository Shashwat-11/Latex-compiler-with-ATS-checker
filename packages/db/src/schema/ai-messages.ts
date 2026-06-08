import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { aiConversations } from './ai-conversations';
import { files } from './files';

export const aiMessageRoleEnum = pgEnum('ai_message_role', ['user', 'assistant', 'system']);

export const aiMessages = pgTable(
  'ai_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: aiMessageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    contextFileId: uuid('context_file_id').references(() => files.id, { onDelete: 'set null' }),
    contextSelection: text('context_selection'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index('idx_ai_messages_conversation_id').on(table.conversationId),
  }),
);

export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;
