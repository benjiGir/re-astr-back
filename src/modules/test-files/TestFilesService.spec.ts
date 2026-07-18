import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, Option, Stream } from 'effect'
import type { TestFile as TestFileRow } from '@/domain/schema/test-files.schema.js'
import { Storage, StorageError } from '@/infra/Storage.js'
import { TestFileNotFound, UpdateTestFile } from '@/modules/test-files/TestFile.js'
import { TestFilesRepo } from '@/modules/test-files/TestFilesRepo.js'
import { TestFilesService, TestFilesServiceLive } from '@/modules/test-files/TestFilesService.js'
import { Test as TestEntity, TestNotFound } from '@/modules/tests/Test.js'
import { TestsService } from '@/modules/tests/TestsService.js'

const now = new Date('2026-01-01T00:00:00.000Z')

const tempDir = mkdtempSync(join(tmpdir(), 'test-files-spec-'))
const tempFilePath = join(tempDir, 'report.pdf')
writeFileSync(tempFilePath, 'fake pdf content')

const mockTestEntity = new TestEntity({
  id: 'test-1',
  projectId: 'project-1',
  categoryId: 'category-1',
  name: 'Thermal run',
  description: null,
  status: 'draft',
  commonData: {},
  customData: {},
  metadata: {},
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: now,
  updatedAt: now,
  completedAt: null,
})

const mockRow: TestFileRow = {
  id: 'file-1',
  testId: 'test-1',
  fileType: 'report',
  originalFilename: 'report.pdf',
  storedFilename: '123-abcdef.pdf',
  bucketName: 'test-archives',
  objectKey: 'tests/2026/01/123-abcdef.pdf',
  fileSize: 16,
  mimeType: 'application/pdf',
  checksum: 'abc123',
  metadata: {},
  uploadedBy: 'user-1',
  uploadedAt: now,
  expiresAt: null,
}

const makeMockRepo = (overrides: Partial<typeof TestFilesRepo.Service> = {}) => ({
  create: vi.fn(() => Effect.succeed(mockRow)),
  findAll: vi.fn(() => Effect.succeed([mockRow])),
  findById: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  update: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  remove: vi.fn(() => Effect.void),
  ...overrides,
})

const makeMockTestsService = (overrides: Partial<typeof TestsService.Service> = {}) => ({
  create: vi.fn(() => Effect.succeed(mockTestEntity)),
  findAll: vi.fn(() => Effect.succeed([mockTestEntity])),
  findOne: vi.fn(() => Effect.succeed(mockTestEntity)),
  update: vi.fn(() => Effect.succeed(mockTestEntity)),
  remove: vi.fn(() => Effect.void),
  ...overrides,
})

const makeMockStorage = (overrides: Partial<typeof Storage.Service> = {}) => ({
  upload: vi.fn(() => Effect.succeed({ etag: 'etag-1' })),
  download: vi.fn(() => Effect.succeed(Stream.make(new Uint8Array([1, 2, 3])))),
  presignedUrl: vi.fn(() => Effect.succeed('https://storage.local/presigned')),
  remove: vi.fn(() => Effect.void),
  ...overrides,
})

const runWithMocks = <A, E>(
  mocks: {
    repo?: Partial<typeof TestFilesRepo.Service>
    tests?: Partial<typeof TestsService.Service>
    storage?: Partial<typeof Storage.Service>
  },
  effect: Effect.Effect<A, E, TestFilesService>,
) =>
  Effect.provide(
    effect,
    TestFilesServiceLive.pipe(
      Layer.provide(Layer.succeed(TestFilesRepo, makeMockRepo(mocks.repo))),
      Layer.provide(Layer.succeed(TestsService, makeMockTestsService(mocks.tests))),
      Layer.provide(Layer.succeed(Storage, makeMockStorage(mocks.storage))),
    ),
  )

describe('TestFilesService', () => {
  it.effect('upload computes the checksum, uploads to storage, and stamps uploadedBy', () => {
    const uploadFn = vi.fn(() => Effect.succeed({ etag: 'etag-1' }))
    const createFn = vi.fn(() => Effect.succeed(mockRow))

    return runWithMocks(
      { storage: { upload: uploadFn }, repo: { create: createFn } },
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const testFile = yield* service.upload(
          {
            testId: 'test-1',
            fileType: 'report',
            file: {
              _tag: 'PersistedFile',
              key: 'file',
              name: 'report.pdf',
              contentType: 'application/pdf',
              path: tempFilePath,
            } as never,
          },
          'user-1',
        )

        expect(testFile.id).toBe('file-1')
        expect(uploadFn).toHaveBeenCalledWith(
          'test-archives',
          expect.stringMatching(/^tests\/\d{4}\/\d{2}\/.+\.pdf$/),
          tempFilePath,
          expect.any(Object),
        )
        expect(createFn).toHaveBeenCalledWith(
          expect.objectContaining({
            uploadedBy: 'user-1',
            originalFilename: 'report.pdf',
            fileSize: 16,
          }),
        )
      }),
    )
  })

  it.effect('upload fails with TestNotFound when the test does not exist', () =>
    runWithMocks(
      { tests: { findOne: vi.fn(() => Effect.fail(new TestNotFound({ id: 'test-1' }))) } },
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const error = yield* Effect.flip(
          service.upload(
            {
              testId: 'test-1',
              fileType: 'report',
              file: {
                _tag: 'PersistedFile',
                key: 'file',
                name: 'report.pdf',
                contentType: 'application/pdf',
                path: tempFilePath,
              } as never,
            },
            'user-1',
          ),
        )
        expect(error).toBeInstanceOf(TestNotFound)
      }),
    ),
  )

  it.effect('findOne fails with TestFileNotFound when the repo returns none', () =>
    runWithMocks(
      { repo: { findById: vi.fn(() => Effect.succeed(Option.none())) } },
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const error = yield* Effect.flip(service.findOne('missing-id'))
        expect(error).toBeInstanceOf(TestFileNotFound)
      }),
    ),
  )

  it.effect('findOne returns the test file when the repo finds a row', () =>
    runWithMocks(
      {},
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const testFile = yield* service.findOne('file-1')
        expect(testFile.id).toBe('file-1')
      }),
    ),
  )

  it.effect('update validates the new testId when provided', () =>
    runWithMocks(
      { tests: { findOne: vi.fn(() => Effect.fail(new TestNotFound({ id: 'other-test' }))) } },
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const error = yield* Effect.flip(
          service.update('file-1', new UpdateTestFile({ testId: 'other-test' })),
        )
        expect(error).toBeInstanceOf(TestNotFound)
      }),
    ),
  )

  it.effect('update fails with TestFileNotFound when the repo update returns none', () =>
    runWithMocks(
      { repo: { update: vi.fn(() => Effect.succeed(Option.none())) } },
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const error = yield* Effect.flip(
          service.update('file-1', new UpdateTestFile({ fileType: 'documentation' })),
        )
        expect(error).toBeInstanceOf(TestFileNotFound)
      }),
    ),
  )

  it.effect('download returns the stream alongside the test file metadata', () =>
    runWithMocks(
      {},
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const { testFile } = yield* service.download('file-1')
        expect(testFile.originalFilename).toBe('report.pdf')
      }),
    ),
  )

  it.effect('presignedUrl delegates to storage with the stored bucket/objectKey', () => {
    const presignedUrlFn = vi.fn(() => Effect.succeed('https://storage.local/presigned'))

    return runWithMocks(
      { storage: { presignedUrl: presignedUrlFn } },
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const url = yield* service.presignedUrl('file-1', 3600)

        expect(url).toBe('https://storage.local/presigned')
        expect(presignedUrlFn).toHaveBeenCalledWith(
          'test-archives',
          'tests/2026/01/123-abcdef.pdf',
          3600,
        )
      }),
    )
  })

  it.effect('remove deletes from storage then the DB row', () => {
    const storageRemoveFn = vi.fn(() => Effect.void)
    const repoRemoveFn = vi.fn(() => Effect.void)

    return runWithMocks(
      { storage: { remove: storageRemoveFn }, repo: { remove: repoRemoveFn } },
      Effect.gen(function* () {
        const service = yield* TestFilesService
        yield* service.remove('file-1')

        expect(storageRemoveFn).toHaveBeenCalledWith(
          'test-archives',
          'tests/2026/01/123-abcdef.pdf',
        )
        expect(repoRemoveFn).toHaveBeenCalledWith('file-1')
      }),
    )
  })

  it.effect('remove keeps the DB row when the storage delete fails', () => {
    const repoRemoveFn = vi.fn(() => Effect.void)

    return runWithMocks(
      {
        storage: {
          remove: vi.fn(() =>
            Effect.fail(new StorageError({ operation: 'remove', cause: 'network error' })),
          ),
        },
        repo: { remove: repoRemoveFn },
      },
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const error = yield* Effect.flip(service.remove('file-1'))

        expect(error).toBeInstanceOf(StorageError)
        expect(repoRemoveFn).not.toHaveBeenCalled()
      }),
    )
  })

  it.effect('remove fails with TestFileNotFound and never touches storage', () => {
    const storageRemoveFn = vi.fn(() => Effect.void)

    return runWithMocks(
      {
        repo: { findById: vi.fn(() => Effect.succeed(Option.none())) },
        storage: { remove: storageRemoveFn },
      },
      Effect.gen(function* () {
        const service = yield* TestFilesService
        const error = yield* Effect.flip(service.remove('missing-id'))

        expect(error).toBeInstanceOf(TestFileNotFound)
        expect(storageRemoveFn).not.toHaveBeenCalled()
      }),
    )
  })
})
