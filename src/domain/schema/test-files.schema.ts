import { sql } from 'drizzle-orm'
import { bigint, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { tests } from './tests.schema.js'
import { users } from './users.schema.js'

export const fileTypeEnum = pgEnum('file_type', ['screenshot', 'report', 'documentation', 'other'])

export const testFiles = pgTable('test_files', {
  id: text().primaryKey().default(sql`gen_random_uuid()`),
  testId: text('test_id')
    .notNull()
    .references(() => tests.id, { onDelete: 'cascade' }),
  fileType: fileTypeEnum('file_type').notNull().default('other'),
  originalFilename: text('original_filename').notNull(),
  storedFilename: text('stored_filename').notNull(),
  bucketName: text('bucket_name').notNull().default('test-archives'),
  objectKey: text('object_key').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  mimeType: text('mime_type').notNull(),
  checksum: text('checksum'), // SHA-256 hash for integrity
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  uploadedBy: text('uploaded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'), // Optional expiration
})

export type TestFile = typeof testFiles.$inferSelect
export type NewTestFile = typeof testFiles.$inferInsert
