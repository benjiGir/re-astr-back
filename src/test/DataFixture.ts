import { Effect, Layer } from 'effect'
import { CredentialsRepo, CredentialsRepoLive } from '@/auth/CredentialsRepo.js'
import { CreateCategory } from '@/modules/categories/Categories.js'
import { CategoriesRepo, CategoriesRepoLive } from '@/modules/categories/CategoriesRepo.js'
import { CreateProject } from '@/modules/projects/Project.js'
import { ProjectsRepo, ProjectsRepoLive } from '@/modules/projects/ProjectsRepo.js'
import { TestsRepo, TestsRepoLive } from '@/modules/tests/TestsRepo.js'
import { DatabaseTestLive } from '@/test/DbTestLayer.js'

const DataFixtureLive = Layer.mergeAll(
  ProjectsRepoLive,
  CategoriesRepoLive,
  TestsRepoLive,
  CredentialsRepoLive,
).pipe(Layer.provide(DatabaseTestLive))

let counter = 0
const unique = (label: string) => `${label}-${Date.now()}-${counter++}`
// CategoriesService.create defaults customFieldsSchema when omitted (see
// DEFAULT_CUSTOM_FIELDS_SCHEMA) — these fixtures call the repo directly,
// bypassing that default, so allowCustomFields must be set explicitly here.
const validCustomFieldsSchema = { allowCustomFields: false, fields: [] }

export interface ProjectAndCategory {
  readonly projectId: string
  readonly categoryId: string
}

/** Direct repo access, bypassing HTTP — this module tests other endpoints, not project/category creation. */
export const createProjectAndCategory: Effect.Effect<ProjectAndCategory> = Effect.gen(function* () {
  const projectsRepo = yield* ProjectsRepo
  const categoriesRepo = yield* CategoriesRepo
  const project = yield* projectsRepo.create(new CreateProject({ name: unique('Project') }))
  const category = yield* categoriesRepo.create(
    new CreateCategory({
      name: unique('Category'),
      baseSchema: { fields: [] },
      customFieldsSchema: validCustomFieldsSchema,
    }),
  )
  return { projectId: project.id, categoryId: category.id }
}).pipe(Effect.provide(DataFixtureLive), Effect.orDie)

export interface TestFixture extends ProjectAndCategory {
  readonly testId: string
}

/** A test row owned by a throwaway user — `createdBy` just needs a valid FK, not the acting caller. */
export const createTest: Effect.Effect<TestFixture> = Effect.gen(function* () {
  const projectsRepo = yield* ProjectsRepo
  const categoriesRepo = yield* CategoriesRepo
  const project = yield* projectsRepo.create(new CreateProject({ name: unique('Project') }))
  const category = yield* categoriesRepo.create(
    new CreateCategory({
      name: unique('Category'),
      baseSchema: { fields: [] },
      customFieldsSchema: validCustomFieldsSchema,
    }),
  )
  const credentialsRepo = yield* CredentialsRepo
  const testsRepo = yield* TestsRepo
  const user = yield* credentialsRepo.createUser({
    email: `${unique('test-owner')}@example.com`,
    name: 'Fixture Owner',
  })
  const test = yield* testsRepo.create({
    projectId: project.id,
    categoryId: category.id,
    name: unique('Test'),
    createdBy: user.id,
  })
  return { projectId: project.id, categoryId: category.id, testId: test.id }
}).pipe(Effect.provide(DataFixtureLive), Effect.orDie)
