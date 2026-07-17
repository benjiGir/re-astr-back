import { Effect, Schema } from 'effect'
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
} from 'effect/unstable/httpapi'
import { Authorization } from '@/auth/Authorization.js'
import { requireRole, requireSelfOrRole } from '@/auth/Role.js'
import {
  AssignRole,
  EmailAlreadyExists,
  User,
  UserHasRecords,
  UserNotFound,
  UpdateUser,
} from '@/modules/users/User.js'
import { UsersService } from '@/modules/users/UsersService.js'

export const UsersGroup = HttpApiGroup.make('users')
  .add(HttpApiEndpoint.get('findAll', '/users', { success: Schema.Array(User) }))
  .add(
    HttpApiEndpoint.get('findById', '/users/:id', {
      params: { id: Schema.String },
      success: User,
      error: UserNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.patch('update', '/users/:id', {
      params: { id: Schema.String },
      payload: UpdateUser,
      success: User,
      error: [UserNotFound, EmailAlreadyExists, HttpApiError.Forbidden],
    }),
  )
  .add(
    HttpApiEndpoint.patch('assignRole', '/users/:id/role', {
      params: { id: Schema.String },
      payload: AssignRole,
      success: User,
      error: [UserNotFound, HttpApiError.Forbidden],
    }),
  )
  .add(
    HttpApiEndpoint.delete('remove', '/users/:id', {
      params: { id: Schema.String },
      error: [UserNotFound, UserHasRecords, HttpApiError.Forbidden],
    }),
  )
  .middleware(Authorization)

// Same self-contained-mini-Api trick as ProjectsHttp.ts (see its comment) — avoids
// a circular import with the real Api (src/Api.ts).
class UsersApi extends HttpApi.make('re-astr').add(UsersGroup) {}

export const UsersGroupLive = HttpApiBuilder.group(UsersApi, 'users', (handlers) =>
  Effect.gen(function* () {
    const service = yield* UsersService

    return handlers
      .handle('findAll', () => service.findAll())
      .handle('findById', ({ params }) => service.findOne(params.id))
      .handle('update', ({ params, payload }) =>
        requireSelfOrRole(params.id, 'master').pipe(
          Effect.andThen(() => service.update(params.id, payload)),
        ),
      )
      .handle('assignRole', ({ params, payload }) =>
        requireRole('master').pipe(
          Effect.andThen(() => service.assignRole(params.id, payload.role)),
        ),
      )
      .handle('remove', ({ params }) =>
        requireRole('master').pipe(Effect.andThen(() => service.remove(params.id))),
      )
  }),
)
