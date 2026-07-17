import { eq } from 'drizzle-orm'
import type { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import { Context, Effect, Layer, Option } from 'effect'
import type { NewTest, Test as TestRow } from '@/domain/schema/tests.schema.js'
import { tests } from '@/domain/schema/tests.schema.js'
import { Database } from '@/infra/Database.js'

export class TestsRepo extends Context.Service<
  TestsRepo,
  {
    readonly create: (input: NewTest) => Effect.Effect<TestRow, EffectDrizzleQueryError>
    readonly findAll: (categoryId?: string) => Effect.Effect<TestRow[], EffectDrizzleQueryError>
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<TestRow>, EffectDrizzleQueryError>
    readonly update: (
      id: string,
      input: Partial<NewTest>,
    ) => Effect.Effect<Option.Option<TestRow>, EffectDrizzleQueryError>
    readonly remove: (id: string) => Effect.Effect<void, EffectDrizzleQueryError>
  }
>()('TestsRepo') {}

export const TestsRepoLive = Layer.effect(
  TestsRepo,
  Effect.gen(function* () {
    const db = yield* Database

    const create = Effect.fn('TestsRepo.create')(function* (input: NewTest) {
      return yield* Effect.map(db.insert(tests).values(input).returning(), ([row]) => row)
    })

    const findAll = Effect.fn('TestsRepo.findAll')(function* (categoryId?: string) {
      return yield* categoryId
        ? db.select().from(tests).where(eq(tests.categoryId, categoryId))
        : db.select().from(tests)
    })

    const findById = Effect.fn('TestsRepo.findById')(function* (id: string) {
      return yield* Effect.map(db.select().from(tests).where(eq(tests.id, id)).limit(1), ([row]) =>
        Option.fromNullishOr(row),
      )
    })

    const update = Effect.fn('TestsRepo.update')(function* (id: string, input: Partial<NewTest>) {
      return yield* Effect.map(
        db
          .update(tests)
          .set({
            ...(input.projectId !== undefined && { projectId: input.projectId }),
            ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.commonData !== undefined && { commonData: input.commonData }),
            ...(input.customData !== undefined && { customData: input.customData }),
            ...(input.metadata !== undefined && { metadata: input.metadata }),
            ...(input.updatedBy !== undefined && { updatedBy: input.updatedBy }),
            ...(input.completedAt !== undefined && { completedAt: input.completedAt }),
          })
          .where(eq(tests.id, id))
          .returning(),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const remove = Effect.fn('TestsRepo.remove')(function* (id: string) {
      return yield* Effect.asVoid(db.delete(tests).where(eq(tests.id, id)))
    })

    return { create, findAll, findById, update, remove }
  }),
)
