import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Context, Effect, Layer, Option, Stream } from 'effect'
import type { Multipart } from 'effect/unstable/http'
import { Minio, MinioError } from '@/infra/Minio.js'
import { TestFile, TestFileNotFound, type TestFileType, type UpdateTestFile } from '@/modules/test-files/TestFile.js'
import { TestFilesRepo } from '@/modules/test-files/TestFilesRepo.js'
import type { TestNotFound } from '@/modules/tests/Test.js'
import { TestsService } from '@/modules/tests/TestsService.js'

const BUCKET = 'test-archives'

export interface UploadTestFileInput {
  readonly testId: string
  readonly fileType: TestFileType
  readonly metadata?: Record<string, unknown>
  readonly expiresAt?: Date
  readonly file: Multipart.PersistedFile
}

export class TestFilesService extends Context.Service<
  TestFilesService,
  {
    readonly upload: (input: UploadTestFileInput, userId: string) => Effect.Effect<TestFile, TestNotFound | MinioError>
    readonly findAll: (testId?: string) => Effect.Effect<TestFile[], TestNotFound>
    readonly findOne: (id: string) => Effect.Effect<TestFile, TestFileNotFound>
    readonly update: (id: string, input: UpdateTestFile) => Effect.Effect<TestFile, TestFileNotFound | TestNotFound>
    readonly download: (
      id: string,
    ) => Effect.Effect<{ readonly stream: Stream.Stream<Uint8Array, MinioError>; readonly testFile: TestFile }, TestFileNotFound | MinioError>
    readonly presignedUrl: (id: string, expirySeconds: number) => Effect.Effect<string, TestFileNotFound | MinioError>
    readonly remove: (id: string) => Effect.Effect<void, TestFileNotFound | MinioError>
  }
>()('TestFilesService') {}

export const TestFilesServiceLive = Layer.effect(
  TestFilesService,
  Effect.gen(function* () {
    const repo = yield* TestFilesRepo
    const testsService = yield* TestsService
    const minio = yield* Minio

    const findOne = (id: string): Effect.Effect<TestFile, TestFileNotFound> =>
      repo.findById(id).pipe(
        Effect.orDie,
        Effect.flatMap(
          Option.match({ onNone: () => Effect.fail(new TestFileNotFound({ id })), onSome: Effect.succeed }),
        ),
        Effect.map((row) => new TestFile(row)),
      )

    return {
      upload: (input, userId) =>
        Effect.gen(function* () {
          yield* testsService.findOne(input.testId)

          const buffer = yield* Effect.promise(() => readFile(input.file.path))
          const checksum = createHash('sha256').update(buffer).digest('hex')

          const timestamp = Date.now()
          const extension = input.file.name.split('.').pop()
          const storedFilename = `${timestamp}-${checksum.slice(0, 8)}.${extension}`

          const now = new Date()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const objectKey = `tests/${now.getFullYear()}/${month}/${storedFilename}`

          yield* minio.upload(BUCKET, objectKey, input.file.path, {
            'content-type': input.file.contentType,
            'original-filename': input.file.name,
          })

          const row = yield* repo
            .create({
              testId: input.testId,
              fileType: input.fileType,
              originalFilename: input.file.name,
              storedFilename,
              bucketName: BUCKET,
              objectKey,
              fileSize: buffer.length,
              mimeType: input.file.contentType,
              checksum,
              metadata: input.metadata ?? {},
              uploadedBy: userId,
              expiresAt: input.expiresAt ?? null,
            })
            .pipe(Effect.orDie)

          return new TestFile(row)
        }).pipe(
          Effect.tap((testFile) =>
            Effect.logInfo('Test file uploaded').pipe(
              Effect.annotateLogs({ id: testFile.id, testId: testFile.testId, objectKey: testFile.objectKey }),
            ),
          ),
        ),

      findAll: (testId) =>
        Effect.gen(function* () {
          if (testId !== undefined) {
            yield* testsService.findOne(testId)
          }
          const rows = yield* repo.findAll(testId).pipe(Effect.orDie)
          return rows.map((row) => new TestFile(row))
        }),

      findOne,

      update: (id, input) =>
        Effect.gen(function* () {
          yield* findOne(id)

          if (input.testId !== undefined) {
            yield* testsService.findOne(input.testId)
          }

          const row = yield* repo
            .update(id, {
              ...(input.testId !== undefined && { testId: input.testId }),
              ...(input.fileType !== undefined && { fileType: input.fileType }),
              ...(input.metadata !== undefined && { metadata: input.metadata }),
              ...(input.expiresAt !== undefined && { expiresAt: new Date(input.expiresAt) }),
            })
            .pipe(
              Effect.orDie,
              Effect.flatMap(
                Option.match({ onNone: () => Effect.fail(new TestFileNotFound({ id })), onSome: Effect.succeed }),
              ),
            )

          return new TestFile(row)
        }).pipe(Effect.tap(() => Effect.logInfo('Test file updated').pipe(Effect.annotateLogs({ id })))),

      download: (id) =>
        findOne(id).pipe(
          Effect.flatMap((testFile) =>
            minio
              .download(testFile.bucketName, testFile.objectKey)
              .pipe(Effect.map((stream) => ({ stream, testFile }))),
          ),
        ),

      presignedUrl: (id, expirySeconds) =>
        findOne(id).pipe(
          Effect.flatMap((testFile) => minio.presignedUrl(testFile.bucketName, testFile.objectKey, expirySeconds)),
        ),

      // Storage delete runs before the DB row does, and its failure is NOT
      // swallowed: if MinIO can't delete the object, the row stays so the API
      // still reflects reality and the delete can be retried. The old service
      // deleted the row regardless, console.error-ing storage failures —
      // silently orphaning objects in MinIO with nothing left pointing at them.
      remove: (id) =>
        findOne(id).pipe(
          Effect.flatMap((testFile) =>
            minio.remove(testFile.bucketName, testFile.objectKey).pipe(
              Effect.tapError((error) =>
                Effect.logError('Failed to delete test file from storage — DB row kept').pipe(
                  Effect.annotateLogs({ id, cause: error.cause }),
                ),
              ),
            ),
          ),
          Effect.andThen(() => repo.remove(id).pipe(Effect.orDie)),
          Effect.tap(() => Effect.logInfo('Test file deleted').pipe(Effect.annotateLogs({ id }))),
        ),
    }
  }),
)
