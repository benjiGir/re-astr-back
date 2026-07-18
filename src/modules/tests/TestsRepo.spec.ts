import { beforeEach, describe, expect, layer } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { CredentialsRepo, CredentialsRepoLive } from '@/auth/CredentialsRepo.js'
import { CreateCategory } from '@/modules/categories/Categories.js'
import { CategoriesRepo, CategoriesRepoLive } from '@/modules/categories/CategoriesRepo.js'
import { CreateProject } from '@/modules/projects/Project.js'
import { ProjectsRepo, ProjectsRepoLive } from '@/modules/projects/ProjectsRepo.js'
import { TestsRepo, TestsRepoLive } from '@/modules/tests/TestsRepo.js'
import { DatabaseTestLive, truncateAll } from '@/test/DbTestLayer.js'

const MISSING_ID = '00000000-0000-0000-0000-000000000000'
let counter = 0
const unique = (label: string) => `${label}-${Date.now()}-${counter++}`

const createFixtureIds = Effect.fn('createFixtureIds')(function* () {
  const projectsRepo = yield* ProjectsRepo
  const categoriesRepo = yield* CategoriesRepo
  const credentialsRepo = yield* CredentialsRepo

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

  return { projectId: project.id, categoryId: category.id, userId: user.id }
})

describe('TestsRepo', () => {
  layer(
    Layer.mergeAll(TestsRepoLive, ProjectsRepoLive, CategoriesRepoLive, CredentialsRepoLive).pipe(
      Layer.provide(DatabaseTestLive),
    ),
  )((it) => {
    beforeEach(() => truncateAll())

    it.effect('create inserts and returns the row', () =>
      Effect.gen(function* () {
        const { projectId, categoryId, userId } = yield* createFixtureIds()
        const repo = yield* TestsRepo

        const test = yield* repo.create({
          projectId,
          categoryId,
          name: 'Load test #1',
          createdBy: userId,
        })

        expect(test.name).toBe('Load test #1')
        expect(test.status).toBe('draft')
      }),
    )

    it.effect('findAll filters by categoryId when provided', () =>
      Effect.gen(function* () {
        const { projectId, categoryId, userId } = yield* createFixtureIds()
        const { categoryId: otherCategoryId } = yield* createFixtureIds()
        const repo = yield* TestsRepo

        yield* repo.create({ projectId, categoryId, name: 'A', createdBy: userId })
        yield* repo.create({ projectId, categoryId: otherCategoryId, name: 'B', createdBy: userId })

        const filtered = yield* repo.findAll(categoryId)
        expect(filtered.map((t) => t.name)).toEqual(['A'])

        const all = yield* repo.findAll()
        expect(all.length).toBe(2)
      }),
    )

    it.effect('findById finds an existing row and returns None for a missing one', () =>
      Effect.gen(function* () {
        const { projectId, categoryId, userId } = yield* createFixtureIds()
        const repo = yield* TestsRepo
        const created = yield* repo.create({ projectId, categoryId, name: 'A', createdBy: userId })

        const found = yield* repo.findById(created.id)
        expect(Option.isSome(found) ? found.value.id : undefined).toBe(created.id)

        const missing = yield* repo.findById(MISSING_ID)
        expect(Option.isNone(missing)).toBe(true)
      }),
    )

    it.effect('update patches only the provided fields', () =>
      Effect.gen(function* () {
        const { projectId, categoryId, userId } = yield* createFixtureIds()
        const repo = yield* TestsRepo
        const created = yield* repo.create({ projectId, categoryId, name: 'A', createdBy: userId })

        const updated = yield* repo.update(created.id, { status: 'completed' })
        expect(Option.isSome(updated) ? updated.value.status : undefined).toBe('completed')
        expect(Option.isSome(updated) ? updated.value.name : undefined).toBe('A')
      }),
    )

    it.effect('remove deletes the row', () =>
      Effect.gen(function* () {
        const { projectId, categoryId, userId } = yield* createFixtureIds()
        const repo = yield* TestsRepo
        const created = yield* repo.create({ projectId, categoryId, name: 'A', createdBy: userId })

        yield* repo.remove(created.id)
        const found = yield* repo.findById(created.id)
        expect(Option.isNone(found)).toBe(true)
      }),
    )
  })
})
