import {boolean, pgTable, text, timestamp, uniqueIndex, uuid} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";

export const users = pgTable(
  'users',
  {
    id: text().primaryKey().default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified')
      .default(false)
      .notNull(),
    image: text('image').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);