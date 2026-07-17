import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import type { Test as TestRow } from '@/domain/schema/tests.schema.js'
import { ValidationFailed } from '@/common/validation/SchemaValidation.js'
import { Category, CategoryNotFound } from '@/modules/categories/Categories.js'
import { CategoriesService } from '@/modules/categories/CategoriesService.js'
import { Project, ProjectNotFound } from '@/modules/projects/Project.js'
import { ProjectsService } from '@/modules/projects/ProjectsService.js'
import { CreateTest, TestNotFound, UpdateTest } from '@/modules/tests/Test.js'
import { TestsRepo } from '@/modules/tests/TestsRepo.js'
import { TestsService, TestsServiceLive } from '@/modules/tests/TestsService.js'

const now = new Date('2026-01-01T00:00:00.000Z')

const mockProject = new Project({
  id: 'project-1',
  name: 'Avionics',
  description: null,
  createdAt: now,
  updatedAt: now,
})

const mockCategory = new Category({
  id: 'category-1',
  name: 'Thermal',
  description: null,
  baseSchema: { fields: [{ key: 'temperature', label: 'Temp', type: 'number', required: true }] },
  customFieldsSchema: { allowCustomFields: true, fields: [] },
  createdAt: now,
  updatedAt: now,
})

const mockRow: TestRow = {
  id: 'test-1',
  projectId: 'project-1',
  categoryId: 'category-1',
  name: 'Thermal cycling run 1',
  description: null,
  status: 'draft',
  commonData: { temperature: 25 },
  customData: {},
  metadata: {},
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: now,
  updatedAt: now,
  completedAt: null,
}

const makeMockRepo = (overrides: Partial<typeof TestsRepo.Service> = {}) => ({
  create: vi.fn(() => Effect.succeed(mockRow)),
  findAll: vi.fn(() => Effect.succeed([mockRow])),
  findById: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  update: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  remove: vi.fn(() => Effect.void),
  ...overrides,
})

const makeMockProjectsService = (overrides: Partial<typeof ProjectsService.Service> = {}) => ({
  create: vi.fn(() => Effect.succeed(mockProject)),
  findAll: vi.fn(() => Effect.succeed([mockProject])),
  findOne: vi.fn(() => Effect.succeed(mockProject)),
  update: vi.fn(() => Effect.succeed(mockProject)),
  remove: vi.fn(() => Effect.void),
  ...overrides,
})

const makeMockCategoriesService = (overrides: Partial<typeof CategoriesService.Service> = {}) => ({
  create: vi.fn(() => Effect.succeed(mockCategory)),
  findAll: vi.fn(() => Effect.succeed([mockCategory])),
  findOne: vi.fn(() => Effect.succeed(mockCategory)),
  update: vi.fn(() => Effect.succeed(mockCategory)),
  remove: vi.fn(() => Effect.void),
  ...overrides,
})

const runWithMocks = <A, E>(
  mocks: {
    repo?: Partial<typeof TestsRepo.Service>
    projects?: Partial<typeof ProjectsService.Service>
    categories?: Partial<typeof CategoriesService.Service>
  },
  effect: Effect.Effect<A, E, TestsService>,
) =>
  Effect.provide(
    effect,
    TestsServiceLive.pipe(
      Layer.provide(Layer.succeed(TestsRepo, makeMockRepo(mocks.repo))),
      Layer.provide(Layer.succeed(ProjectsService, makeMockProjectsService(mocks.projects))),
      Layer.provide(Layer.succeed(CategoriesService, makeMockCategoriesService(mocks.categories))),
    ),
  )

const validCreate = new CreateTest({
  projectId: 'project-1',
  categoryId: 'category-1',
  name: 'Thermal cycling run 1',
  commonData: { temperature: 25 },
})

describe('TestsService', () => {
  it.effect('create returns the created test and stamps createdBy/updatedBy', () => {
    const createFn = vi.fn(() => Effect.succeed(mockRow))

    return runWithMocks(
      { repo: { create: createFn } },
      Effect.gen(function* () {
        const service = yield* TestsService
        const test = yield* service.create(validCreate, 'user-1')

        expect(test.id).toBe('test-1')
        expect(createFn).toHaveBeenCalledWith(
          expect.objectContaining({ createdBy: 'user-1', updatedBy: 'user-1', status: 'draft' }),
        )
      }),
    )
  })

  it.effect('create fails with ProjectNotFound when the project does not exist', () =>
    runWithMocks(
      { projects: { findOne: vi.fn(() => Effect.fail(new ProjectNotFound({ id: 'project-1' }))) } },
      Effect.gen(function* () {
        const service = yield* TestsService
        const error = yield* Effect.flip(service.create(validCreate, 'user-1'))
        expect(error).toBeInstanceOf(ProjectNotFound)
      }),
    ),
  )

  it.effect('create fails with CategoryNotFound when the category does not exist', () =>
    runWithMocks(
      {
        categories: {
          findOne: vi.fn(() => Effect.fail(new CategoryNotFound({ id: 'category-1' }))),
        },
      },
      Effect.gen(function* () {
        const service = yield* TestsService
        const error = yield* Effect.flip(service.create(validCreate, 'user-1'))
        expect(error).toBeInstanceOf(CategoryNotFound)
      }),
    ),
  )

  it.effect(
    'create fails with ValidationFailed when commonData does not match the category baseSchema',
    () =>
      runWithMocks(
        {},
        Effect.gen(function* () {
          const service = yield* TestsService
          const invalid = new CreateTest({
            projectId: 'project-1',
            categoryId: 'category-1',
            name: 'Bad test',
            commonData: { temperature: 'hot' },
          })
          const error = yield* Effect.flip(service.create(invalid, 'user-1'))
          expect(error).toBeInstanceOf(ValidationFailed)
          if (error instanceof ValidationFailed) expect(error.context).toBe('commonData')
        }),
      ),
  )

  it.effect('findOne fails with TestNotFound when the repo returns none', () =>
    runWithMocks(
      { repo: { findById: vi.fn(() => Effect.succeed(Option.none())) } },
      Effect.gen(function* () {
        const service = yield* TestsService
        const error = yield* Effect.flip(service.findOne('missing-id'))
        expect(error).toBeInstanceOf(TestNotFound)
      }),
    ),
  )

  it.effect('findOne returns the test when the repo finds a row', () =>
    runWithMocks(
      {},
      Effect.gen(function* () {
        const service = yield* TestsService
        const test = yield* service.findOne('test-1')
        expect(test.id).toBe('test-1')
      }),
    ),
  )

  it.effect('update stamps completedAt when status transitions to completed', () => {
    const updateFn = vi.fn(() =>
      Effect.succeed(Option.some({ ...mockRow, status: 'completed' as const, completedAt: now })),
    )

    return runWithMocks(
      { repo: { update: updateFn } },
      Effect.gen(function* () {
        const service = yield* TestsService
        yield* service.update('test-1', new UpdateTest({ status: 'completed' }), 'user-1')

        expect(updateFn).toHaveBeenCalledWith(
          'test-1',
          expect.objectContaining({
            status: 'completed',
            updatedBy: 'user-1',
            completedAt: expect.any(Date),
          }),
        )
      }),
    )
  })

  it.effect(
    'update fails with ValidationFailed when customData is not allowed by the category',
    () =>
      runWithMocks(
        {
          categories: {
            findOne: vi.fn(() =>
              Effect.succeed(
                new Category({
                  ...mockCategory,
                  customFieldsSchema: { allowCustomFields: false, fields: [] },
                }),
              ),
            ),
          },
        },
        Effect.gen(function* () {
          const service = yield* TestsService
          const error = yield* Effect.flip(
            service.update('test-1', new UpdateTest({ customData: { extra: 'nope' } }), 'user-1'),
          )
          expect(error).toBeInstanceOf(ValidationFailed)
          if (error instanceof ValidationFailed) expect(error.context).toBe('customData')
        }),
      ),
  )

  it.effect('remove fails with TestNotFound and never calls repo.remove', () => {
    const removeFn = vi.fn(() => Effect.void)

    return runWithMocks(
      { repo: { findById: vi.fn(() => Effect.succeed(Option.none())), remove: removeFn } },
      Effect.gen(function* () {
        const service = yield* TestsService
        const error = yield* Effect.flip(service.remove('missing-id'))
        expect(error).toBeInstanceOf(TestNotFound)
        expect(removeFn).not.toHaveBeenCalled()
      }),
    )
  })

  it.effect('remove succeeds when the test exists', () =>
    runWithMocks(
      {},
      Effect.gen(function* () {
        const service = yield* TestsService
        yield* service.remove('test-1')
      }),
    ),
  )
})
