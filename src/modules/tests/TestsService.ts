import { Context, Effect, Layer, Option } from 'effect'
import { validateCommonData, validateCustomData, validateOrFail, type ValidationFailed } from '@/common/validation/SchemaValidation.js'
import type { CategoryNotFound } from '@/modules/categories/Categories.js'
import { CategoriesService } from '@/modules/categories/CategoriesService.js'
import type { ProjectNotFound } from '@/modules/projects/Project.js'
import { ProjectsService } from '@/modules/projects/ProjectsService.js'
import { Test, TestNotFound, type CreateTest, type UpdateTest } from '@/modules/tests/Test.js'
import { TestsRepo } from '@/modules/tests/TestsRepo.js'

export class TestsService extends Context.Service<
  TestsService,
  {
    readonly create: (
      input: CreateTest,
      userId: string,
    ) => Effect.Effect<Test, ProjectNotFound | CategoryNotFound | ValidationFailed>
    readonly findAll: (categoryId?: string) => Effect.Effect<Test[]>
    readonly findOne: (id: string) => Effect.Effect<Test, TestNotFound>
    readonly update: (
      id: string,
      input: UpdateTest,
      userId: string,
    ) => Effect.Effect<Test, TestNotFound | ProjectNotFound | CategoryNotFound | ValidationFailed>
    readonly remove: (id: string) => Effect.Effect<void, TestNotFound>
  }
>()('TestsService') {}

export const TestsServiceLive = Layer.effect(
  TestsService,
  Effect.gen(function* () {
    const repo = yield* TestsRepo
    const categoriesService = yield* CategoriesService
    const projectsService = yield* ProjectsService

    const findOne = (id: string): Effect.Effect<Test, TestNotFound> =>
      repo.findById(id).pipe(
        Effect.orDie,
        Effect.flatMap(Option.match({ onNone: () => Effect.fail(new TestNotFound({ id })), onSome: Effect.succeed })),
        Effect.map((row) => new Test(row)),
      )

    /** update-only: projectId existence (if given) + the resolved category's schemas against commonData/customData (if given). */
    const validateAgainstCategory = (input: UpdateTest, fallbackCategoryId: string) =>
      Effect.gen(function* () {
        if (input.projectId !== undefined) {
          yield* projectsService.findOne(input.projectId)
        }

        const category = yield* categoriesService.findOne(input.categoryId ?? fallbackCategoryId)

        if (input.commonData !== undefined) {
          yield* validateOrFail(validateCommonData(input.commonData, category.baseSchema), 'commonData')
        }
        if (input.customData !== undefined) {
          yield* validateOrFail(validateCustomData(input.customData, category.customFieldsSchema), 'customData')
        }
      })

    return {
      create: (input, userId) =>
        Effect.gen(function* () {
          yield* projectsService.findOne(input.projectId)
          const category = yield* categoriesService.findOne(input.categoryId)

          yield* validateOrFail(validateCommonData(input.commonData, category.baseSchema), 'commonData')
          const customData = input.customData ?? {}
          yield* validateOrFail(validateCustomData(customData, category.customFieldsSchema), 'customData')

          const row = yield* repo
            .create({
              projectId: input.projectId,
              categoryId: input.categoryId,
              name: input.name,
              description: input.description ?? null,
              status: input.status ?? 'draft',
              commonData: input.commonData,
              customData,
              metadata: input.metadata ?? {},
              createdBy: userId,
              updatedBy: userId,
            })
            .pipe(Effect.orDie)

          return new Test(row)
        }).pipe(
          Effect.tap((test) =>
            Effect.logInfo('Test created').pipe(Effect.annotateLogs({ id: test.id, name: test.name })),
          ),
        ),

      findAll: (categoryId) =>
        Effect.orDie(Effect.map(repo.findAll(categoryId), (rows) => rows.map((row) => new Test(row)))),

      findOne,

      update: (id, input, userId) =>
        Effect.gen(function* () {
          const existing = yield* findOne(id)
          yield* validateAgainstCategory(input, existing.categoryId)

          const row = yield* repo
            .update(id, {
              ...(input.projectId !== undefined && { projectId: input.projectId }),
              ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
              ...(input.name !== undefined && { name: input.name }),
              ...(input.description !== undefined && { description: input.description }),
              ...(input.status !== undefined && { status: input.status }),
              ...(input.commonData !== undefined && { commonData: input.commonData }),
              ...(input.customData !== undefined && { customData: input.customData }),
              ...(input.metadata !== undefined && { metadata: input.metadata }),
              updatedBy: userId,
              ...(input.status === 'completed' && { completedAt: new Date() }),
            })
            .pipe(
              Effect.orDie,
              Effect.flatMap(
                Option.match({ onNone: () => Effect.fail(new TestNotFound({ id })), onSome: Effect.succeed }),
              ),
            )

          return new Test(row)
        }).pipe(Effect.tap(() => Effect.logInfo('Test updated').pipe(Effect.annotateLogs({ id })))),

      remove: (id) =>
        findOne(id).pipe(
          Effect.andThen(() => repo.remove(id).pipe(Effect.orDie)),
          Effect.tap(() => Effect.logInfo('Test deleted').pipe(Effect.annotateLogs({ id }))),
        ),
    }
  }),
)
