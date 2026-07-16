import { eq } from 'drizzle-orm'
import type { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import { Context, Effect, Layer, Option } from 'effect'
import type { NewUser, User as UserRow, UserRole } from '@/domain/schema/users.schema.js'
import { users } from '@/domain/schema/users.schema.js'
import { Database } from '@/infra/Database.js'

export class UsersRepo extends Context.Service<
  UsersRepo,
  {
    readonly findAll: () => Effect.Effect<UserRow[], EffectDrizzleQueryError>
    readonly findById: (id: string) => Effect.Effect<Option.Option<UserRow>, EffectDrizzleQueryError>
    readonly update: (
      id: string,
      input: Partial<NewUser>,
    ) => Effect.Effect<Option.Option<UserRow>, EffectDrizzleQueryError>
    readonly assignRole: (id: string, role: UserRole) => Effect.Effect<Option.Option<UserRow>, EffectDrizzleQueryError>
    readonly remove: (id: string) => Effect.Effect<void, EffectDrizzleQueryError>
  }
>()('UsersRepo') {}

export const UsersRepoLive = Layer.effect(
  UsersRepo,
  Effect.gen(function* () {
    const db = yield* Database

    const findAll = Effect.fn('UsersRepo.findAll')(function* () {
      return yield* db.select().from(users)
    })

    const findById = Effect.fn('UsersRepo.findById')(function* (id: string) {
      return yield* Effect.map(db.select().from(users).where(eq(users.id, id)).limit(1), ([row]) =>
        Option.fromNullishOr(row),
      )
    })

    const update = Effect.fn('UsersRepo.update')(function* (id: string, input: Partial<NewUser>) {
      return yield* Effect.map(
        db
          .update(users)
          .set({
            ...(input.name !== undefined && { name: input.name }),
            ...(input.email !== undefined && { email: input.email }),
            ...(input.image !== undefined && { image: input.image }),
            ...(input.emailVerified !== undefined && { emailVerified: input.emailVerified }),
          })
          .where(eq(users.id, id))
          .returning(),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const assignRole = Effect.fn('UsersRepo.assignRole')(function* (id: string, role: UserRole) {
      return yield* Effect.map(db.update(users).set({ role }).where(eq(users.id, id)).returning(), ([row]) =>
        Option.fromNullishOr(row),
      )
    })

    const remove = Effect.fn('UsersRepo.remove')(function* (id: string) {
      return yield* Effect.asVoid(db.delete(users).where(eq(users.id, id)))
    })

    return { findAll, findById, update, assignRole, remove }
  }),
)
