import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const sessions = pgTable(
  'sessions',
  {
    id: uuid().notNull().primaryKey().defaultRandom(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_token_idx').on(table.token),
  ],
)
