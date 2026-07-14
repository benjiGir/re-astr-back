import { Context, Effect, Layer, Option } from 'effect'
import { sqlReasonTag } from '@/infra/Database.js'
import {
  Category,
  CategoryHasTests,
  CategoryNotFound,
  type CreateCategory,
  type UpdateCategory,
} from '@/modules/categories/Categories.js'
import { CategoriesRepo } from '@/modules/categories/CategoriesRepo.js'

/** Applied when a caller omits customFieldsSchema on create — mirrors the old Nest service's default. */
const DEFAULT_CUSTOM_FIELDS_SCHEMA = {
  allowCustomFields: true,
  maxCustomFields: 10,
  allowedTypes: ['text', 'number', 'boolean', 'date'] as const,
  fields: [],
}

export class CategoriesService extends Context.Service<
  CategoriesService,
  {
    readonly create: (input: CreateCategory) => Effect.Effect<Category>
    readonly findAll: () => Effect.Effect<Category[]>
    readonly findOne: (id: string) => Effect.Effect<Category, CategoryNotFound>
    readonly update: (id: string, input: UpdateCategory) => Effect.Effect<Category, CategoryNotFound>
    readonly remove: (id: string) => Effect.Effect<void, CategoryNotFound | CategoryHasTests>
  }
>()('CategoriesService') {}

export const CategoriesServiceLive = Layer.effect(
  CategoriesService,
  Effect.gen(function* () {
    const repo = yield* CategoriesRepo

    const findOne = (id: string): Effect.Effect<Category, CategoryNotFound> =>
      repo.findById(id).pipe(
        Effect.orDie,
        Effect.flatMap(
          Option.match({ onNone: () => Effect.fail(new CategoryNotFound({ id })), onSome: Effect.succeed }),
        ),
        Effect.map((row) => new Category(row)),
      )

    return {
      create: (input) =>
        repo
          .create({ ...input, customFieldsSchema: input.customFieldsSchema ?? DEFAULT_CUSTOM_FIELDS_SCHEMA })
          .pipe(
            Effect.orDie,
            Effect.map((row) => new Category(row)),
            Effect.tap((category) =>
              Effect.logInfo('Category created').pipe(
                Effect.annotateLogs({ id: category.id, name: category.name }),
              ),
            ),
          ),

      findAll: () => Effect.orDie(Effect.map(repo.findAll(), (rows) => rows.map((row) => new Category(row)))),

      findOne,

      update: (id, input) =>
        findOne(id).pipe(
          Effect.andThen(() => repo.update(id, input)),
          Effect.orDie,
          Effect.flatMap(
            Option.match({ onNone: () => Effect.fail(new CategoryNotFound({ id })), onSome: Effect.succeed }),
          ),
          Effect.map((row) => new Category(row)),
          Effect.tap(() => Effect.logInfo('Category updated').pipe(Effect.annotateLogs({ id }))),
        ),

      remove: (id) =>
        findOne(id).pipe(
          Effect.andThen(() => repo.remove(id)),
          Effect.tap(() => Effect.logInfo('Category deleted').pipe(Effect.annotateLogs({ id }))),
          Effect.catchTag('EffectDrizzleQueryError', (error) =>
            sqlReasonTag(error) === 'ConstraintError' ? Effect.fail(new CategoryHasTests({ id })) : Effect.die(error),
          ),
        ),
    }
  }),
)
