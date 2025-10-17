import { sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)],
)
