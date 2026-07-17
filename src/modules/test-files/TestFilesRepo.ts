import { eq } from 'drizzle-orm'
import type { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import { Context, Effect, Layer, Option } from 'effect'
import type { NewTestFile, TestFile as TestFileRow } from '@/domain/schema/test-files.schema.js'
import { testFiles } from '@/domain/schema/test-files.schema.js'
import { Database } from '@/infra/Database.js'

export class TestFilesRepo extends Context.Service<
  TestFilesRepo,
  {
    readonly create: (input: NewTestFile) => Effect.Effect<TestFileRow, EffectDrizzleQueryError>
    readonly findAll: (testId?: string) => Effect.Effect<TestFileRow[], EffectDrizzleQueryError>
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<TestFileRow>, EffectDrizzleQueryError>
    readonly update: (
      id: string,
      input: Partial<NewTestFile>,
    ) => Effect.Effect<Option.Option<TestFileRow>, EffectDrizzleQueryError>
    readonly remove: (id: string) => Effect.Effect<void, EffectDrizzleQueryError>
  }
>()('TestFilesRepo') {}

export const TestFilesRepoLive = Layer.effect(
  TestFilesRepo,
  Effect.gen(function* () {
    const db = yield* Database

    const create = Effect.fn('TestFilesRepo.create')(function* (input: NewTestFile) {
      return yield* Effect.map(db.insert(testFiles).values(input).returning(), ([row]) => row)
    })

    const findAll = Effect.fn('TestFilesRepo.findAll')(function* (testId?: string) {
      return yield* testId
        ? db.select().from(testFiles).where(eq(testFiles.testId, testId))
        : db.select().from(testFiles)
    })

    const findById = Effect.fn('TestFilesRepo.findById')(function* (id: string) {
      return yield* Effect.map(
        db.select().from(testFiles).where(eq(testFiles.id, id)).limit(1),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const update = Effect.fn('TestFilesRepo.update')(function* (
      id: string,
      input: Partial<NewTestFile>,
    ) {
      return yield* Effect.map(
        db
          .update(testFiles)
          .set({
            ...(input.testId !== undefined && { testId: input.testId }),
            ...(input.fileType !== undefined && { fileType: input.fileType }),
            ...(input.metadata !== undefined && { metadata: input.metadata }),
            ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
          })
          .where(eq(testFiles.id, id))
          .returning(),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const remove = Effect.fn('TestFilesRepo.remove')(function* (id: string) {
      return yield* Effect.asVoid(db.delete(testFiles).where(eq(testFiles.id, id)))
    })

    return { create, findAll, findById, update, remove }
  }),
)
