import { Context, Effect, Layer, Option } from 'effect'
import type { UserRole } from '@/domain/schema/users.schema.js'
import { sqlReasonTag } from '@/infra/Database.js'
import {
  EmailAlreadyExists,
  User,
  UserHasRecords,
  UserNotFound,
  type UpdateUser,
} from '@/modules/users/User.js'
import { UsersRepo } from '@/modules/users/UsersRepo.js'

export class UsersService extends Context.Service<
  UsersService,
  {
    readonly findAll: Effect.Effect<User[]>
    readonly findOne: (id: string) => Effect.Effect<User, UserNotFound>
    readonly update: (
      id: string,
      input: UpdateUser,
    ) => Effect.Effect<User, UserNotFound | EmailAlreadyExists>
    readonly assignRole: (id: string, role: UserRole) => Effect.Effect<User, UserNotFound>
    readonly remove: (id: string) => Effect.Effect<void, UserNotFound | UserHasRecords>
  }
>()('UsersService') {}

export const UsersServiceLive = Layer.effect(
  UsersService,
  Effect.gen(function* () {
    const repo = yield* UsersRepo

    const findOne = Effect.fn('UsersService.findOne')(function* (id: string) {
      return yield* repo.findById(id).pipe(
        Effect.orDie,
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new UserNotFound({ id })),
            onSome: Effect.succeed,
          }),
        ),
        Effect.map((row) => new User(row)),
      )
    })

    const findAll = repo.findAll.pipe(
      Effect.map((rows) => rows.map((row) => new User(row))),
      Effect.orDie,
      Effect.withSpan('UsersService.findAll'),
    )

    const update = Effect.fn('UsersService.update')(function* (id: string, input: UpdateUser) {
      return yield* findOne(id).pipe(
        Effect.andThen(() => repo.update(id, input)),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new UserNotFound({ id })),
            onSome: Effect.succeed,
          }),
        ),
        Effect.map((row) => new User(row)),
        Effect.tap(() => Effect.logInfo('User updated').pipe(Effect.annotateLogs({ id }))),
        Effect.catchTag('EffectDrizzleQueryError', (error) =>
          sqlReasonTag(error) === 'UniqueViolation'
            ? Effect.fail(new EmailAlreadyExists({ email: input.email ?? '' }))
            : Effect.die(error),
        ),
      )
    })

    const assignRole = Effect.fn('UsersService.assignRole')(function* (id: string, role: UserRole) {
      return yield* findOne(id).pipe(
        Effect.andThen(() => repo.assignRole(id, role).pipe(Effect.orDie)),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new UserNotFound({ id })),
            onSome: Effect.succeed,
          }),
        ),
        Effect.map((row) => new User(row)),
        Effect.tap(() =>
          Effect.logInfo('User role changed').pipe(Effect.annotateLogs({ id, role })),
        ),
      )
    })

    const remove = Effect.fn('UsersService.remove')(function* (id: string) {
      return yield* findOne(id).pipe(
        Effect.andThen(() => repo.remove(id)),
        Effect.tap(() => Effect.logInfo('User deleted').pipe(Effect.annotateLogs({ id }))),
        Effect.catchTag('EffectDrizzleQueryError', (error) =>
          sqlReasonTag(error) === 'ConstraintError'
            ? Effect.fail(new UserHasRecords({ id }))
            : Effect.die(error),
        ),
      )
    })

    return { findAll, findOne, update, assignRole, remove }
  }),
)
