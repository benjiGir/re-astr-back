import { Schema } from 'effect'
import { UserRole } from '@/domain/schema/users.schema.js'

export class User extends Schema.Class<User>('User')({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  image: Schema.NullOr(Schema.String),
  role: UserRole,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
}) {}

export class UpdateUser extends Schema.Class<UpdateUser>('UpdateUser')({
  name: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  image: Schema.optional(Schema.String),
  emailVerified: Schema.optional(Schema.Boolean),
}) {}

export class AssignRole extends Schema.Class<AssignRole>('AssignRole')({
  role: UserRole,
}) {}

export class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>('re-astr/UserNotFound')(
  'UserNotFound',
  { id: Schema.String },
  { httpApiStatus: 404 },
) {}

/** Shared with auth/Credentials.ts (sign-up hits the same users.email unique constraint). */
export class EmailAlreadyExists extends Schema.TaggedErrorClass<EmailAlreadyExists>(
  're-astr/EmailAlreadyExists',
)('EmailAlreadyExists', { email: Schema.String }, { httpApiStatus: 409 }) {}

/** Mirrors ProjectHasTests/CategoryHasTests: tests.createdBy and test_files.uploadedBy are both onDelete: 'restrict'. */
export class UserHasRecords extends Schema.TaggedErrorClass<UserHasRecords>(
  're-astr/UserHasRecords',
)('UserHasRecords', { id: Schema.String }, { httpApiStatus: 409 }) {}
