import { Schema } from 'effect'

export const TestFileType = Schema.Literals(['screenshot', 'report', 'documentation', 'other'])
export type TestFileType = typeof TestFileType.Type

export class TestFile extends Schema.Class<TestFile>('TestFile')({
  id: Schema.String,
  testId: Schema.String,
  fileType: TestFileType,
  originalFilename: Schema.String,
  storedFilename: Schema.String,
  bucketName: Schema.String,
  objectKey: Schema.String,
  fileSize: Schema.Number,
  mimeType: Schema.String,
  checksum: Schema.NullOr(Schema.String),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
  uploadedBy: Schema.String,
  uploadedAt: Schema.DateFromString,
  expiresAt: Schema.NullOr(Schema.DateFromString),
}) {}

/**
 * Only the fields that don't describe the actual stored bytes are editable —
 * no objectKey/bucketName/mimeType/checksum. The old Nest DTO allowed patching
 * those too, which let a contributor redirect a row at an arbitrary MinIO
 * object; download/presigned-url would then serve whatever that path held.
 */
export class UpdateTestFile extends Schema.Class<UpdateTestFile>('UpdateTestFile')({
  testId: Schema.optional(Schema.String),
  fileType: Schema.optional(TestFileType),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  expiresAt: Schema.optional(Schema.String),
}) {}

export class TestFileNotFound extends Schema.ErrorClass<TestFileNotFound>('re-astr/TestFileNotFound')(
  { _tag: Schema.tag('TestFileNotFound'), id: Schema.String },
  { httpApiStatus: 404 },
) {}
