import { beforeEach, describe, expect, layer } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { CredentialsRepo, CredentialsRepoLive } from '@/auth/CredentialsRepo.js'
import { CreateCategory } from '@/modules/categories/Categories.js'
import { CategoriesRepo, CategoriesRepoLive } from '@/modules/categories/CategoriesRepo.js'
import { CreateProject } from '@/modules/projects/Project.js'
import { ProjectsRepo, ProjectsRepoLive } from '@/modules/projects/ProjectsRepo.js'
import { TestFilesRepo, TestFilesRepoLive } from '@/modules/test-files/TestFilesRepo.js'
import { TestsRepo, TestsRepoLive } from '@/modules/tests/TestsRepo.js'
import { DatabaseTestLive, truncateAll } from '@/test/DbTestLayer.js'

const MISSING_ID = '00000000-0000-0000-0000-000000000000'
let counter = 0
const unique = (label: string) => `${label}-${Date.now()}-${counter++}`

const createTestFixture = Effect.fn('createTestFixture')(function* () {
  const projectsRepo = yield* ProjectsRepo
  const categoriesRepo = yield* CategoriesRepo
  const credentialsRepo = yield* CredentialsRepo
  const testsRepo = yield* TestsRepo

  const project = yield* projectsRepo.create(new CreateProject({ name: unique('Project') }))
  // CategoriesService.create defaults customFieldsSchema when omitted; this
  // fixture calls the repo directly, so allowCustomFields must be set here.
  const category = yield* categoriesRepo.create(
    new CreateCategory({
      name: unique('Category'),
      baseSchema: { fields: [] },
      customFieldsSchema: { allowCustomFields: false, fields: [] },
    }),
  )
  const user = yield* credentialsRepo.createUser({
    email: `${unique('user')}@example.com`,
    name: 'Fixture User',
  })
  const test = yield* testsRepo.create({
    projectId: project.id,
    categoryId: category.id,
    name: 'Fixture Test',
    createdBy: user.id,
  })

  return { testId: test.id, userId: user.id }
})

describe('TestFilesRepo', () => {
  layer(
    Layer.mergeAll(
      TestFilesRepoLive,
      TestsRepoLive,
      ProjectsRepoLive,
      CategoriesRepoLive,
      CredentialsRepoLive,
    ).pipe(Layer.provide(DatabaseTestLive)),
  )((it) => {
    beforeEach(() => truncateAll())

    it.effect('create inserts and returns the row', () =>
      Effect.gen(function* () {
        const { testId, userId } = yield* createTestFixture()
        const repo = yield* TestFilesRepo

        const testFile = yield* repo.create({
          testId,
          originalFilename: 'report.pdf',
          storedFilename: 'stored-report.pdf',
          objectKey: 'tests/2026/01/stored-report.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadedBy: userId,
        })

        expect(testFile.originalFilename).toBe('report.pdf')
        expect(testFile.bucketName).toBe('test-archives')
      }),
    )

    it.effect('findAll filters by testId when provided', () =>
      Effect.gen(function* () {
        const { testId, userId } = yield* createTestFixture()
        const { testId: otherTestId } = yield* createTestFixture()
        const repo = yield* TestFilesRepo

        yield* repo.create({
          testId,
          originalFilename: 'a.pdf',
          storedFilename: 'a.pdf',
          objectKey: 'a.pdf',
          fileSize: 1,
          mimeType: 'application/pdf',
          uploadedBy: userId,
        })
        yield* repo.create({
          testId: otherTestId,
          originalFilename: 'b.pdf',
          storedFilename: 'b.pdf',
          objectKey: 'b.pdf',
          fileSize: 1,
          mimeType: 'application/pdf',
          uploadedBy: userId,
        })

        const filtered = yield* repo.findAll(testId)
        expect(filtered.map((f) => f.originalFilename)).toEqual(['a.pdf'])

        const all = yield* repo.findAll()
        expect(all.length).toBe(2)
      }),
    )

    it.effect('findById finds an existing row and returns None for a missing one', () =>
      Effect.gen(function* () {
        const { testId, userId } = yield* createTestFixture()
        const repo = yield* TestFilesRepo
        const created = yield* repo.create({
          testId,
          originalFilename: 'a.pdf',
          storedFilename: 'a.pdf',
          objectKey: 'a.pdf',
          fileSize: 1,
          mimeType: 'application/pdf',
          uploadedBy: userId,
        })

        const found = yield* repo.findById(created.id)
        expect(Option.isSome(found) ? found.value.id : undefined).toBe(created.id)

        const missing = yield* repo.findById(MISSING_ID)
        expect(Option.isNone(missing)).toBe(true)
      }),
    )

    it.effect('update patches only the provided fields', () =>
      Effect.gen(function* () {
        const { testId, userId } = yield* createTestFixture()
        const repo = yield* TestFilesRepo
        const created = yield* repo.create({
          testId,
          fileType: 'other',
          originalFilename: 'a.pdf',
          storedFilename: 'a.pdf',
          objectKey: 'a.pdf',
          fileSize: 1,
          mimeType: 'application/pdf',
          uploadedBy: userId,
        })

        const updated = yield* repo.update(created.id, { fileType: 'report' })
        expect(Option.isSome(updated) ? updated.value.fileType : undefined).toBe('report')
        expect(Option.isSome(updated) ? updated.value.originalFilename : undefined).toBe('a.pdf')
      }),
    )

    it.effect('remove deletes the row', () =>
      Effect.gen(function* () {
        const { testId, userId } = yield* createTestFixture()
        const repo = yield* TestFilesRepo
        const created = yield* repo.create({
          testId,
          originalFilename: 'a.pdf',
          storedFilename: 'a.pdf',
          objectKey: 'a.pdf',
          fileSize: 1,
          mimeType: 'application/pdf',
          uploadedBy: userId,
        })

        yield* repo.remove(created.id)
        const found = yield* repo.findById(created.id)
        expect(Option.isNone(found)).toBe(true)
      }),
    )
  })
})
