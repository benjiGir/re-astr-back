import { eq } from 'drizzle-orm'
import type { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import { Context, Effect, Layer, Option } from 'effect'
import { Category as CategoryRow, categories } from '@/domain/schema/categories.schema.js'
import { Database } from '@/infra/Database.js'
import type { CreateCategory, UpdateCategory } from '@/modules/categories/Categories.js'

export class CategoriesRepo extends Context.Service<
  CategoriesRepo,
  {
    readonly create: (input: CreateCategory) => Effect.Effect<CategoryRow, EffectDrizzleQueryError>
    readonly findAll: () => Effect.Effect<CategoryRow[], EffectDrizzleQueryError>
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<CategoryRow>, EffectDrizzleQueryError>
    readonly update: (
      id: string,
      input: UpdateCategory,
    ) => Effect.Effect<Option.Option<CategoryRow>, EffectDrizzleQueryError>
    readonly remove: (id: string) => Effect.Effect<void, EffectDrizzleQueryError>
  }
>()('CategoriesRepo') {}

export const CategoriesRepoLive = Layer.effect(
  CategoriesRepo,
  Effect.gen(function* () {
    const db = yield* Database

    // customFieldsSchema is expected to already be fully resolved by
    // CategoriesService (default applied) — the repo never defaults it.
    const create = Effect.fn('CategoriesRepo.create')(function* (input: CreateCategory) {
      return yield* Effect.map(
        db
          .insert(categories)
          .values({
            name: input.name,
            description: input.description ?? null,
            baseSchema: input.baseSchema,
            customFieldsSchema: input.customFieldsSchema,
          })
          .returning(),
        ([row]) => row,
      )
    })

    const findAll = Effect.fn('CategoriesRepo.findAll')(function* () {
      return yield* db.select().from(categories)
    })

    const findById = Effect.fn('CategoriesRepo.findById')(function* (id: string) {
      return yield* Effect.map(
        db.select().from(categories).where(eq(categories.id, id)).limit(1),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const update = Effect.fn('CategoriesRepo.update')(function* (
      id: string,
      input: UpdateCategory,
    ) {
      return yield* Effect.map(
        db
          .update(categories)
          .set({
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.baseSchema !== undefined && { baseSchema: input.baseSchema }),
            ...(input.customFieldsSchema !== undefined && {
              customFieldsSchema: input.customFieldsSchema,
            }),
          })
          .where(eq(categories.id, id))
          .returning(),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const remove = Effect.fn('CategoriesRepo.remove')(function* (id: string) {
      return yield* Effect.asVoid(db.delete(categories).where(eq(categories.id, id)))
    })

    return { create, findAll, findById, update, remove }
  }),
)
