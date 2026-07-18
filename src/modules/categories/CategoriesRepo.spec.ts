import { beforeEach, describe, expect, layer } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { CategoriesRepo, CategoriesRepoLive } from '@/modules/categories/CategoriesRepo.js'
import { CreateCategory, UpdateCategory } from '@/modules/categories/Categories.js'
import { DatabaseTestLive, truncateAll } from '@/test/DbTestLayer.js'

const MISSING_ID = '00000000-0000-0000-0000-000000000000'
const emptyBaseSchema = { fields: [] }
// CategoriesService.create defaults customFieldsSchema when omitted (see
// DEFAULT_CUSTOM_FIELDS_SCHEMA) — these tests call the repo directly, bypassing
// that default, so allowCustomFields (required, no DB-level default) must be set here.
const validCustomFieldsSchema = { allowCustomFields: false, fields: [] }

describe('CategoriesRepo', () => {
  layer(CategoriesRepoLive.pipe(Layer.provide(DatabaseTestLive)))((it) => {
    beforeEach(() => truncateAll())

    it.effect('create inserts and returns the row', () =>
      Effect.gen(function* () {
        const repo = yield* CategoriesRepo
        const category = yield* repo.create(
          new CreateCategory({
            name: 'Load Tests',
            baseSchema: emptyBaseSchema,
            customFieldsSchema: validCustomFieldsSchema,
          }),
        )
        expect(category.name).toBe('Load Tests')
        expect(category.baseSchema).toEqual(emptyBaseSchema)
      }),
    )

    it.effect('findAll returns every created row', () =>
      Effect.gen(function* () {
        const repo = yield* CategoriesRepo
        yield* repo.create(
          new CreateCategory({
            name: 'A',
            baseSchema: emptyBaseSchema,
            customFieldsSchema: validCustomFieldsSchema,
          }),
        )
        yield* repo.create(
          new CreateCategory({
            name: 'B',
            baseSchema: emptyBaseSchema,
            customFieldsSchema: validCustomFieldsSchema,
          }),
        )
        const all = yield* repo.findAll()
        expect(all.map((c) => c.name).sort()).toEqual(['A', 'B'])
      }),
    )

    it.effect('findById finds an existing row and returns None for a missing one', () =>
      Effect.gen(function* () {
        const repo = yield* CategoriesRepo
        const created = yield* repo.create(
          new CreateCategory({
            name: 'A',
            baseSchema: emptyBaseSchema,
            customFieldsSchema: validCustomFieldsSchema,
          }),
        )

        const found = yield* repo.findById(created.id)
        expect(Option.isSome(found) ? found.value.id : undefined).toBe(created.id)

        const missing = yield* repo.findById(MISSING_ID)
        expect(Option.isNone(missing)).toBe(true)
      }),
    )

    it.effect('update patches only the provided fields', () =>
      Effect.gen(function* () {
        const repo = yield* CategoriesRepo
        const created = yield* repo.create(
          new CreateCategory({
            name: 'A',
            description: 'orig',
            baseSchema: emptyBaseSchema,
            customFieldsSchema: validCustomFieldsSchema,
          }),
        )

        const updated = yield* repo.update(created.id, new UpdateCategory({ name: 'B' }))
        expect(Option.isSome(updated) ? updated.value.name : undefined).toBe('B')
        expect(Option.isSome(updated) ? updated.value.description : undefined).toBe('orig')
      }),
    )

    it.effect('remove deletes the row', () =>
      Effect.gen(function* () {
        const repo = yield* CategoriesRepo
        const created = yield* repo.create(
          new CreateCategory({
            name: 'A',
            baseSchema: emptyBaseSchema,
            customFieldsSchema: validCustomFieldsSchema,
          }),
        )
        yield* repo.remove(created.id)
        const found = yield* repo.findById(created.id)
        expect(Option.isNone(found)).toBe(true)
      }),
    )
  })
})
