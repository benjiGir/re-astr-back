import { Effect, Schema } from 'effect'
import { HttpServerResponse, Multipart } from 'effect/unstable/http'
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
} from 'effect/unstable/httpapi'
import { Authorization } from '@/auth/Authorization.js'
import { CurrentUser } from '@/auth/CurrentUser.js'
import { requireRole } from '@/auth/Role.js'
import { MinioError } from '@/infra/Minio.js'
import { TestFile, TestFileNotFound, TestFileType, UpdateTestFile } from '@/modules/test-files/TestFile.js'
import { TestFilesService } from '@/modules/test-files/TestFilesService.js'
import { TestNotFound } from '@/modules/tests/Test.js'

// Matches the old @fastify/multipart registration (fileSize: 50 * 1024 * 1024).
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

const UploadTestFileFields = Schema.Struct({
  testId: Schema.String,
  fileType: TestFileType,
  // Multipart text fields are always strings — metadata arrives JSON-encoded
  // by the client and gets parsed in the handler, same as the old DTO.
  metadata: Schema.optional(Schema.String),
  expiresAt: Schema.optional(Schema.String),
  file: Multipart.SingleFileSchema,
})

export const UploadTestFile = UploadTestFileFields.pipe(HttpApiSchema.asMultipart({ maxFileSize: MAX_UPLOAD_BYTES }))

export class PresignedUrlResponse extends Schema.Class<PresignedUrlResponse>('PresignedUrlResponse')({
  url: Schema.String,
}) {}

export const TestFilesGroup = HttpApiGroup.make('test-files')
  .add(
    HttpApiEndpoint.post('upload', '/test-files/upload', {
      payload: UploadTestFile,
      success: TestFile.pipe(HttpApiSchema.status(201)),
      error: [TestNotFound, MinioError, HttpApiError.Forbidden],
    }),
  )
  .add(
    HttpApiEndpoint.get('findAll', '/test-files', {
      query: { testId: Schema.optional(Schema.String) },
      success: Schema.Array(TestFile),
      error: TestNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.get('findById', '/test-files/:id', {
      params: { id: Schema.String },
      success: TestFile,
      error: TestFileNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.patch('update', '/test-files/:id', {
      params: { id: Schema.String },
      payload: UpdateTestFile,
      success: TestFile,
      error: [TestFileNotFound, TestNotFound, HttpApiError.Forbidden],
    }),
  )
  .add(
    HttpApiEndpoint.get('download', '/test-files/:id/download', {
      params: { id: Schema.String },
      success: HttpApiSchema.StreamUint8Array(),
      error: [TestFileNotFound, MinioError],
    }),
  )
  .add(
    HttpApiEndpoint.get('presignedUrl', '/test-files/:id/presigned-url', {
      params: { id: Schema.String },
      query: { expirySeconds: Schema.optional(Schema.NumberFromString) },
      success: PresignedUrlResponse,
      error: [TestFileNotFound, MinioError],
    }),
  )
  .add(
    HttpApiEndpoint.delete('remove', '/test-files/:id', {
      params: { id: Schema.String },
      error: [TestFileNotFound, MinioError, HttpApiError.Forbidden],
    }),
  )
  .middleware(Authorization)

// Same self-contained-mini-Api trick as ProjectsHttp.ts (see its comment) — avoids
// a circular import with the real Api (src/Api.ts).
class TestFilesApi extends HttpApi.make('re-astr').add(TestFilesGroup) {}

export const TestFilesGroupLive = HttpApiBuilder.group(TestFilesApi, 'test-files', (handlers) =>
  Effect.gen(function* () {
    const service = yield* TestFilesService

    return handlers
      .handle('upload', ({ payload }) =>
        Effect.gen(function* () {
          yield* requireRole('contributor')
          const user = yield* CurrentUser

          return yield* service.upload(
            {
              testId: payload.testId,
              fileType: payload.fileType,
              metadata: parseMetadata(payload.metadata),
              expiresAt: payload.expiresAt !== undefined ? new Date(payload.expiresAt) : undefined,
              file: payload.file,
            },
            user.id,
          )
        }),
      )
      .handle('findAll', ({ query }) => service.findAll(query.testId))
      .handle('findById', ({ params }) => service.findOne(params.id))
      .handle('update', ({ params, payload }) =>
        requireRole('contributor').pipe(Effect.andThen(() => service.update(params.id, payload))),
      )
      .handle('download', ({ params }) =>
        Effect.gen(function* () {
          const { stream, testFile } = yield* service.download(params.id)

          return HttpServerResponse.stream(stream, {
            headers: {
              'content-type': testFile.mimeType,
              'content-disposition': `attachment; filename="${testFile.originalFilename}"`,
              'content-length': String(testFile.fileSize),
            },
          })
        }),
      )
      .handle('presignedUrl', ({ params, query }) =>
        Effect.map(service.presignedUrl(params.id, query.expirySeconds ?? 3600), (url) => new PresignedUrlResponse({ url })),
      )
      .handle('remove', ({ params }) =>
        requireRole('archivist').pipe(Effect.andThen(() => service.remove(params.id))),
      )
  }),
)

// Malformed metadata shouldn't fail the whole upload — it's supplementary data,
// not core to the file's integrity (same laxness the old DTO had around it).
const parseMetadata = (raw: string | undefined): Record<string, unknown> | undefined => {
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}
