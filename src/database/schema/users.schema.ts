import {boolean, pgTable, text, timestamp, uniqueIndex, uuid, pgEnum} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";

export const userRoleEnum = pgEnum('user_role', [
  'master',
  'archivist',
  'contributor',
  'user',
]);

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
    role: userRoleEnum('role').notNull().default('user'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = 'master' | 'archivist' | 'contributor' | 'user';