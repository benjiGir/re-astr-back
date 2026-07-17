import { Effect, Schema } from 'effect'
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
} from 'effect/unstable/httpapi'
import { Authorization } from '@/auth/Authorization.js'
import { CurrentUser } from '@/auth/CurrentUser.js'
import { requireRole } from '@/auth/Role.js'
import { ValidationFailed } from '@/common/validation/SchemaValidation.js'
import { CategoryNotFound } from '@/modules/categories/Categories.js'
import { ProjectNotFound } from '@/modules/projects/Project.js'
import { CreateTest, Test, TestNotFound, UpdateTest } from '@/modules/tests/Test.js'
import { TestsService } from '@/modules/tests/TestsService.js'

export const TestsGroup = HttpApiGroup.make('tests')
  .add(
    HttpApiEndpoint.post('create', '/tests', {
      payload: CreateTest,
      success: Test.pipe(HttpApiSchema.status(201)),
      error: [ProjectNotFound, CategoryNotFound, ValidationFailed, HttpApiError.Forbidden],
    }),
  )
  .add(
    HttpApiEndpoint.get('findAll', '/tests', {
      query: { categoryId: Schema.optional(Schema.String) },
      success: Schema.Array(Test),
    }),
  )
  .add(
    HttpApiEndpoint.get('findById', '/tests/:id', {
      params: { id: Schema.String },
      success: Test,
      error: TestNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.patch('update', '/tests/:id', {
      params: { id: Schema.String },
      payload: UpdateTest,
      success: Test,
      error: [
        TestNotFound,
        ProjectNotFound,
        CategoryNotFound,
        ValidationFailed,
        HttpApiError.Forbidden,
      ],
    }),
  )
  .add(
    HttpApiEndpoint.delete('remove', '/tests/:id', {
      params: { id: Schema.String },
      error: [TestNotFound, HttpApiError.Forbidden],
    }),
  )
  .middleware(Authorization)

// Same self-contained-mini-Api trick as ProjectsHttp.ts (see its comment) — avoids
// a circular import with the real Api (src/Api.ts).
class TestsApi extends HttpApi.make('re-astr').add(TestsGroup) {}

export const TestsGroupLive = HttpApiBuilder.group(TestsApi, 'tests', (handlers) =>
  Effect.gen(function* () {
    const service = yield* TestsService

    return handlers
      .handle('create', ({ payload }) =>
        Effect.gen(function* () {
          yield* requireRole('contributor')
          const user = yield* CurrentUser
          return yield* service.create(payload, user.id)
        }),
      )
      .handle('findAll', ({ query }) => service.findAll(query.categoryId))
      .handle('findById', ({ params }) => service.findOne(params.id))
      .handle('update', ({ params, payload }) =>
        Effect.gen(function* () {
          yield* requireRole('contributor')
          const user = yield* CurrentUser
          return yield* service.update(params.id, payload, user.id)
        }),
      )
      .handle('remove', ({ params }) =>
        requireRole('archivist').pipe(Effect.andThen(() => service.remove(params.id))),
      )
  }),
)
