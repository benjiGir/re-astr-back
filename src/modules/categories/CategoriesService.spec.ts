import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import type { Category as CategoryRow } from '@/domain/schema/categories.schema.js'
import { CategoriesRepo } from '@/modules/categories/CategoriesRepo.js'
import { CategoriesService, CategoriesServiceLive } from '@/modules/categories/CategoriesService.js'
import { CategoryNotFound, CreateCategory } from '@/modules/categories/Categories.js'

const now = new Date('2026-01-01T00:00:00.000Z')

const baseSchema = {
  fields: [{ key: 'temperature', label: 'Température (°C)', type: 'number', required: true }],
} as const
const customFieldsSchema = {
  allowCustomFields: true,
  maxCustomFields: 10,
  allowedTypes: ['text'],
  fields: [],
} as const

const mockRow: CategoryRow = {
  id: 'category-1',
  name: 'Tests de Température',
  description: null,
  baseSchema,
  customFieldsSchema,
  createdAt: now,
  updatedAt: now,
}

const makeMockRepo = (overrides: Partial<typeof CategoriesRepo.Service> = {}) => ({
  create: vi.fn(() => Effect.succeed(mockRow)),
  findAll: Effect.succeed([mockRow]),
  findById: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  update: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  remove: vi.fn(() => Effect.void),
  ...overrides,
})

const runWithRepo = <A, E>(
  repo: typeof CategoriesRepo.Service,
  effect: Effect.Effect<A, E, CategoriesService>,
) =>
  Effect.provide(
    effect,
    CategoriesServiceLive.pipe(Layer.provide(Layer.succeed(CategoriesRepo, repo))),
  )

describe('CategoriesService', () => {
  it.effect('create returns the created category', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* CategoriesService
        const category = yield* service.create(
          new CreateCategory({ name: 'Tests de Température', baseSchema }),
        )

        expect(category.id).toBe('category-1')
        expect(category.name).toBe('Tests de Température')
      }),
    ),
  )

  it.effect('create fills in the default customFieldsSchema when omitted', () => {
    const createFn = vi.fn(() => Effect.succeed(mockRow))

    return runWithRepo(
      makeMockRepo({ create: createFn }),
      Effect.gen(function* () {
        const service = yield* CategoriesService
        yield* service.create(new CreateCategory({ name: 'Tests de Température', baseSchema }))

        expect(createFn).toHaveBeenCalledWith(
          expect.objectContaining({
            customFieldsSchema: {
              allowCustomFields: true,
              maxCustomFields: 10,
              allowedTypes: ['text', 'number', 'boolean', 'date'],
              fields: [],
            },
          }),
        )
      }),
    )
  })

  it.effect('findOne fails with CategoryNotFound when the repo returns none', () =>
    runWithRepo(
      makeMockRepo({ findById: vi.fn(() => Effect.succeed(Option.none())) }),
      Effect.gen(function* () {
        const service = yield* CategoriesService
        const error = yield* Effect.flip(service.findOne('missing-id'))

        expect(error).toBeInstanceOf(CategoryNotFound)
        expect(error.id).toBe('missing-id')
      }),
    ),
  )

  it.effect('findOne returns the category when the repo finds a row', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* CategoriesService
        const category = yield* service.findOne('category-1')

        expect(category.id).toBe('category-1')
      }),
    ),
  )

  it.effect('update returns the updated category', () =>
    runWithRepo(
      makeMockRepo({ update: vi.fn(() => Effect.succeed(Option.some(mockRow))) }),
      Effect.gen(function* () {
        const service = yield* CategoriesService
        const category = yield* service.update('category-1', { name: 'Renamed' })
        expect(category.id).toBe('category-1')
      }),
    ),
  )

  it.effect('update fails with CategoryNotFound when the repo update returns none', () =>
    runWithRepo(
      makeMockRepo({ update: vi.fn(() => Effect.succeed(Option.none())) }),
      Effect.gen(function* () {
        const service = yield* CategoriesService
        const error = yield* Effect.flip(service.update('category-1', { name: 'Renamed' }))
        expect(error).toBeInstanceOf(CategoryNotFound)
      }),
    ),
  )

  it.effect('remove fails with CategoryNotFound and never calls repo.remove', () => {
    const removeFn = vi.fn(() => Effect.void)

    return runWithRepo(
      makeMockRepo({ findById: vi.fn(() => Effect.succeed(Option.none())), remove: removeFn }),
      Effect.gen(function* () {
        const service = yield* CategoriesService
        const error = yield* Effect.flip(service.remove('missing-id'))

        expect(error).toBeInstanceOf(CategoryNotFound)
        expect(removeFn).not.toHaveBeenCalled()
      }),
    )
  })

  it.effect('remove succeeds when the category exists', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* CategoriesService
        yield* service.remove('category-1')
      }),
    ),
  )
})
