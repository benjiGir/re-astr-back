import { sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
)

export type Verification = typeof verifications.$inferSelect
export type NewVerification = typeof verifications.$inferInsert
