import { sql } from 'drizzle-orm'
import { jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { categories } from './categories.schema'
import { users } from './users.schema'

export const testStatusEnum = pgEnum('test_status', [
  'draft',
  'in_progress',
  'completed',
  'failed',
  'archived',
])

export const tests = pgTable('tests', {
  id: text().primaryKey().default(sql`gen_random_uuid()`),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  description: text('description'),
  status: testStatusEnum('status').notNull().default('draft'),
  commonData: jsonb('common_data').notNull().default(sql`'{}'::jsonb`),
  customData: jsonb('custom_data').notNull().default(sql`'{}'::jsonb`),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  updatedBy: text('updated_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  completedAt: timestamp('completed_at'),
})

export type Test = typeof tests.$inferSelect
export type NewTest = typeof tests.$inferInsert
