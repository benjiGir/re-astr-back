import type { BaseSchema, CustomFieldsSchema } from '@common/validation/schema.types'
import { sql } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: text().primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  baseSchema: jsonb('base_schema')
    .$type<BaseSchema>()
    .notNull()
    .default(sql`'{"fields": []}'::jsonb`),
  customFieldsSchema: jsonb('custom_fields_schema')
    .$type<CustomFieldsSchema>()
    .notNull()
    .default(sql`'{"fields": []}'::jsonb`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
})

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
