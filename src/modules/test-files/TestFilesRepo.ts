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
    readonly findById: (id: string) => Effect.Effect<Option.Option<TestFileRow>, EffectDrizzleQueryError>
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

    return {
      create: (input) => Effect.map(db.insert(testFiles).values(input).returning(), ([row]) => row),

      findAll: (testId) =>
        testId ? db.select().from(testFiles).where(eq(testFiles.testId, testId)) : db.select().from(testFiles),

      findById: (id) =>
        Effect.map(db.select().from(testFiles).where(eq(testFiles.id, id)).limit(1), ([row]) =>
          Option.fromNullishOr(row),
        ),

      update: (id, input) =>
        Effect.map(
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
        ),

      remove: (id) => Effect.asVoid(db.delete(testFiles).where(eq(testFiles.id, id))),
    }
  }),
)
