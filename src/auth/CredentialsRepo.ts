import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import { Context, Effect, Layer, Option } from 'effect'
import { accounts, type Account, type NewAccount } from '@/domain/schema/accounts.schema.js'
import { sessions, type Session } from '@/domain/schema/sessions.schema.js'
import { users, type NewUser, type User } from '@/domain/schema/users.schema.js'
import { verifications, type NewVerification, type Verification } from '@/domain/schema/verifications.schema.js'
import { Database } from '@/infra/Database.js'

export class CredentialsRepo extends Context.Service<
  CredentialsRepo,
  {
    readonly findUserByEmail: (email: string) => Effect.Effect<Option.Option<User>, EffectDrizzleQueryError>
    readonly createUser: (input: NewUser) => Effect.Effect<User, EffectDrizzleQueryError>
    readonly createAccount: (input: NewAccount) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly findAccountByUserId: (userId: string) => Effect.Effect<Option.Option<Account>, EffectDrizzleQueryError>
    readonly updateAccountPassword: (userId: string, password: string) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly createSession: (userId: string, expiresAt: Date) => Effect.Effect<Session, EffectDrizzleQueryError>
    readonly deleteSession: (sessionId: string) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly deleteSessionsByUserId: (userId: string) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly createVerification: (input: NewVerification) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly findVerificationByToken: (token: string) => Effect.Effect<Option.Option<Verification>, EffectDrizzleQueryError>
    readonly deleteVerification: (id: string) => Effect.Effect<void, EffectDrizzleQueryError>
  }
>()('CredentialsRepo') {}

export const CredentialsRepoLive = Layer.effect(
  CredentialsRepo,
  Effect.gen(function* () {
    const db = yield* Database

    return {
      findUserByEmail: (email) =>
        Effect.map(db.select().from(users).where(eq(users.email, email)).limit(1), ([row]) =>
          Option.fromNullishOr(row),
        ),

      createUser: (input) => Effect.map(db.insert(users).values(input).returning(), ([row]) => row),

      createAccount: (input) => Effect.asVoid(db.insert(accounts).values(input)),

      findAccountByUserId: (userId) =>
        Effect.map(db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1), ([row]) =>
          Option.fromNullishOr(row),
        ),

      updateAccountPassword: (userId, password) =>
        Effect.asVoid(db.update(accounts).set({ password }).where(eq(accounts.userId, userId))),

      createSession: (userId, expiresAt) =>
        Effect.map(db.insert(sessions).values({ token: randomUUID(), userId, expiresAt }).returning(), ([row]) => row),

      deleteSession: (sessionId) => Effect.asVoid(db.delete(sessions).where(eq(sessions.id, sessionId))),

      deleteSessionsByUserId: (userId) => Effect.asVoid(db.delete(sessions).where(eq(sessions.userId, userId))),

      createVerification: (input) => Effect.asVoid(db.insert(verifications).values(input)),

      findVerificationByToken: (token) =>
        Effect.map(db.select().from(verifications).where(eq(verifications.value, token)).limit(1), ([row]) =>
          Option.fromNullishOr(row),
        ),

      deleteVerification: (id) => Effect.asVoid(db.delete(verifications).where(eq(verifications.id, id))),
    }
  }),
)
