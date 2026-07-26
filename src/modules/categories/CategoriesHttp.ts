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
import { requireRole } from '@/auth/Role.js'
import {
  Category,
  CategoryHasTests,
  CategoryNotFound,
  CreateCategory,
  UpdateCategory,
} from '@/modules/categories/Categories.js'
import { CategoriesService } from '@/modules/categories/CategoriesService.js'

export const CategoriesGroup = HttpApiGroup.make('categories')
  .add(
    HttpApiEndpoint.post('create', '/categories', {
      payload: CreateCategory,
      success: Category.pipe(HttpApiSchema.status(201)),
      error: [HttpApiError.Forbidden],
    }),
  )
  .add(HttpApiEndpoint.get('findAll', '/categories', { success: Schema.Array(Category) }))
  .add(
    HttpApiEndpoint.get('findById', '/categories/:id', {
      params: { id: Schema.String },
      success: Category,
      error: CategoryNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.patch('update', '/categories/:id', {
      params: { id: Schema.String },
      payload: UpdateCategory,
      success: Category,
      error: [CategoryNotFound, HttpApiError.Forbidden],
    }),
  )
  .add(
    HttpApiEndpoint.delete('remove', '/categories/:id', {
      params: { id: Schema.String },
      error: [CategoryNotFound, CategoryHasTests, HttpApiError.Forbidden],
    }),
  )
  .middleware(Authorization)

// Same self-contained-mini-Api trick as ProjectsHttp.ts (see its comment) — avoids
// a circular import with the real Api (src/Api.ts).
class CategoriesApi extends HttpApi.make('re-astr').add(CategoriesGroup) {}

export const CategoriesGroupLive = HttpApiBuilder.group(CategoriesApi, 'categories', (handlers) =>
  Effect.gen(function* () {
    const service = yield* CategoriesService

    return handlers
      .handle('create', ({ payload }) =>
        requireRole('contributor').pipe(Effect.andThen(() => service.create(payload))),
      )
      .handle('findAll', () => service.findAll)
      .handle('findById', ({ params }) => service.findOne(params.id))
      .handle('update', ({ params, payload }) =>
        requireRole('archivist').pipe(Effect.andThen(() => service.update(params.id, payload))),
      )
      .handle('remove', ({ params }) =>
        requireRole('archivist').pipe(Effect.andThen(() => service.remove(params.id))),
      )
  }),
)
