import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import { Context, Effect, Layer, Option } from 'effect'
import { accounts, type Account, type NewAccount } from '@/domain/schema/accounts.schema.js'
import { sessions, type Session } from '@/domain/schema/sessions.schema.js'
import { users, type NewUser, type User } from '@/domain/schema/users.schema.js'
import {
  verifications,
  type NewVerification,
  type Verification,
} from '@/domain/schema/verifications.schema.js'
import { Database } from '@/infra/Database.js'

export class CredentialsRepo extends Context.Service<
  CredentialsRepo,
  {
    readonly findUserByEmail: (
      email: string,
    ) => Effect.Effect<Option.Option<User>, EffectDrizzleQueryError>
    readonly createUser: (input: NewUser) => Effect.Effect<User, EffectDrizzleQueryError>
    readonly createAccount: (input: NewAccount) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly findAccountByUserId: (
      userId: string,
    ) => Effect.Effect<Option.Option<Account>, EffectDrizzleQueryError>
    readonly updateAccountPassword: (
      userId: string,
      password: string,
    ) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly createSession: (
      userId: string,
      expiresAt: Date,
    ) => Effect.Effect<Session, EffectDrizzleQueryError>
    readonly deleteSession: (sessionId: string) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly deleteSessionsByUserId: (
      userId: string,
    ) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly createVerification: (
      input: NewVerification,
    ) => Effect.Effect<void, EffectDrizzleQueryError>
    readonly findVerificationByToken: (
      token: string,
    ) => Effect.Effect<Option.Option<Verification>, EffectDrizzleQueryError>
    readonly deleteVerification: (id: string) => Effect.Effect<void, EffectDrizzleQueryError>
  }
>()('CredentialsRepo') {}

export const CredentialsRepoLive = Layer.effect(
  CredentialsRepo,
  Effect.gen(function* () {
    const db = yield* Database

    const findUserByEmail = Effect.fn('CredentialsRepo.findUserByEmail')(function* (email: string) {
      return yield* Effect.map(
        db.select().from(users).where(eq(users.email, email)).limit(1),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const createUser = Effect.fn('CredentialsRepo.createUser')(function* (input: NewUser) {
      return yield* Effect.map(db.insert(users).values(input).returning(), ([row]) => row)
    })

    const createAccount = Effect.fn('CredentialsRepo.createAccount')(function* (input: NewAccount) {
      return yield* Effect.asVoid(db.insert(accounts).values(input))
    })

    const findAccountByUserId = Effect.fn('CredentialsRepo.findAccountByUserId')(function* (
      userId: string,
    ) {
      return yield* Effect.map(
        db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const updateAccountPassword = Effect.fn('CredentialsRepo.updateAccountPassword')(function* (
      userId: string,
      password: string,
    ) {
      return yield* Effect.asVoid(
        db.update(accounts).set({ password }).where(eq(accounts.userId, userId)),
      )
    })

    const createSession = Effect.fn('CredentialsRepo.createSession')(function* (
      userId: string,
      expiresAt: Date,
    ) {
      return yield* Effect.map(
        db.insert(sessions).values({ token: randomUUID(), userId, expiresAt }).returning(),
        ([row]) => row,
      )
    })

    const deleteSession = Effect.fn('CredentialsRepo.deleteSession')(function* (sessionId: string) {
      return yield* Effect.asVoid(db.delete(sessions).where(eq(sessions.id, sessionId)))
    })

    const deleteSessionsByUserId = Effect.fn('CredentialsRepo.deleteSessionsByUserId')(function* (
      userId: string,
    ) {
      return yield* Effect.asVoid(db.delete(sessions).where(eq(sessions.userId, userId)))
    })

    const createVerification = Effect.fn('CredentialsRepo.createVerification')(function* (
      input: NewVerification,
    ) {
      return yield* Effect.asVoid(db.insert(verifications).values(input))
    })

    const findVerificationByToken = Effect.fn('CredentialsRepo.findVerificationByToken')(function* (
      token: string,
    ) {
      return yield* Effect.map(
        db.select().from(verifications).where(eq(verifications.value, token)).limit(1),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const deleteVerification = Effect.fn('CredentialsRepo.deleteVerification')(function* (
      id: string,
    ) {
      return yield* Effect.asVoid(db.delete(verifications).where(eq(verifications.id, id)))
    })

    return {
      findUserByEmail,
      createUser,
      createAccount,
      findAccountByUserId,
      updateAccountPassword,
      createSession,
      deleteSession,
      deleteSessionsByUserId,
      createVerification,
      findVerificationByToken,
      deleteVerification,
    }
  }),
)
