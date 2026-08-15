import { Schema } from 'effect'

export const TestStatus = Schema.Literals([
  'draft',
  'in_progress',
  'completed',
  'failed',
  'archived',
])

export class Test extends Schema.Class<Test>('Test')({
  id: Schema.String,
  projectId: Schema.String,
  categoryId: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  status: TestStatus,
  commonData: Schema.Record(Schema.String, Schema.Unknown),
  customData: Schema.Record(Schema.String, Schema.Unknown),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
  createdBy: Schema.String,
  updatedBy: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
  completedAt: Schema.NullOr(Schema.DateFromString),
}) {}

export class CreateTest extends Schema.Class<CreateTest>('CreateTest')({
  categoryId: Schema.String,
  projectId: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  status: Schema.optional(TestStatus),
  commonData: Schema.Record(Schema.String, Schema.Unknown),
  customData: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
}) {}

export class UpdateTest extends Schema.Class<UpdateTest>('UpdateTest')({
  categoryId: Schema.optional(Schema.String),
  projectId: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  status: Schema.optional(TestStatus),
  commonData: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  customData: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
}) {}

export class TestNotFound extends Schema.TaggedError<TestNotFound>('re-astr/TestNotFound')(
  'TestNotFound',
  { id: Schema.String },
  { httpApiStatus: 404 },
) {}
