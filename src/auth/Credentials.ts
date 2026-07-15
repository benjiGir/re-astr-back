import argon2 from 'argon2'
import { randomBytes } from 'node:crypto'
import { Context, Effect, Layer, Option, Schema } from 'effect'
import type { Session } from '@/domain/schema/sessions.schema.js'
import type { User } from '@/domain/schema/users.schema.js'
import { CredentialsRepo } from '@/auth/CredentialsRepo.js'
import { SessionConfig } from '@/infra/Config.js'
import { sqlReasonTag } from '@/infra/Database.js'

export class EmailAlreadyExists extends Schema.ErrorClass<EmailAlreadyExists>('re-astr/EmailAlreadyExists')(
  { _tag: Schema.tag('EmailAlreadyExists'), email: Schema.String },
  { httpApiStatus: 409 },
) {}

/** Deliberately generic — never reveals whether the email exists or the password was wrong. */
export class InvalidCredentials extends Schema.ErrorClass<InvalidCredentials>('re-astr/InvalidCredentials')(
  { _tag: Schema.tag('InvalidCredentials') },
  { httpApiStatus: 401 },
) {}

export class InvalidResetToken extends Schema.ErrorClass<InvalidResetToken>('re-astr/InvalidResetToken')(
  { _tag: Schema.tag('InvalidResetToken') },
  { httpApiStatus: 400 },
) {}

export interface AuthSession {
  readonly user: User
  readonly session: Session
}

// No email delivery exists anywhere in this app (old or new) — no
// sendResetPassword callback was ever configured on the old Better Auth setup.
// This builds the token generate/store/verify mechanics end-to-end; the token
// itself never leaves the server (matching the old behavior, not a regression).
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export class Credentials extends Context.Service<
  Credentials,
  {
    readonly signUp: (email: string, password: string, name?: string) => Effect.Effect<AuthSession, EmailAlreadyExists>
    readonly signIn: (email: string, password: string) => Effect.Effect<AuthSession, InvalidCredentials>
    readonly signOut: (sessionId: string) => Effect.Effect<void>
    readonly requestPasswordReset: (email: string) => Effect.Effect<void>
    readonly resetPassword: (token: string, newPassword: string) => Effect.Effect<void, InvalidResetToken>
  }
>()('Credentials') {}

export const CredentialsLive = Layer.effect(
  Credentials,
  Effect.gen(function* () {
    const repo = yield* CredentialsRepo
    const sessionConfig = yield* SessionConfig

    const createSession = (userId: string): Effect.Effect<Session> =>
      repo.createSession(userId, new Date(Date.now() + sessionConfig.expiresIn * 1000)).pipe(Effect.orDie)

    return {
      signUp: (email, password, name) =>
        Effect.gen(function* () {
          const passwordHash = yield* Effect.promise(() => argon2.hash(password))

          const user = yield* repo
            // Old DTO left `name` optional but the column is NOT NULL — Better
            // Auth's own fallback for this case isn't visible to us (fully
            // internal), so this defaults to the email's local part.
            .createUser({ email, name: name ?? email.split('@')[0] })
            .pipe(
              Effect.catchTag('EffectDrizzleQueryError', (error) =>
                sqlReasonTag(error) === 'UniqueViolation'
                  ? Effect.fail(new EmailAlreadyExists({ email }))
                  : Effect.die(error),
              ),
            )

          yield* repo
            .createAccount({ accountId: user.id, providerId: 'credential', userId: user.id, password: passwordHash })
            .pipe(Effect.orDie)

          const session = yield* createSession(user.id)
          return { user, session }
        }).pipe(
          Effect.tap(({ user }) => Effect.logInfo('User signed up').pipe(Effect.annotateLogs({ userId: user.id }))),
        ),

      signIn: (email, password) =>
        Effect.gen(function* () {
          const user = yield* repo.findUserByEmail(email).pipe(Effect.orDie)
          if (Option.isNone(user)) return yield* Effect.fail(new InvalidCredentials())

          const account = yield* repo.findAccountByUserId(user.value.id).pipe(Effect.orDie)
          if (Option.isNone(account) || !account.value.password) return yield* Effect.fail(new InvalidCredentials())
          const passwordHash: string = account.value.password

          const valid = yield* Effect.promise(() => argon2.verify(passwordHash, password))
          if (!valid) return yield* Effect.fail(new InvalidCredentials())

          const session = yield* createSession(user.value.id)
          return { user: user.value, session }
        }).pipe(
          Effect.tap(({ user }) => Effect.logInfo('User signed in').pipe(Effect.annotateLogs({ userId: user.id }))),
        ),

      signOut: (sessionId) => repo.deleteSession(sessionId).pipe(Effect.orDie),

      requestPasswordReset: (email) =>
        Effect.gen(function* () {
          const user = yield* repo.findUserByEmail(email).pipe(Effect.orDie)
          if (Option.isNone(user)) return // never reveal whether the email exists

          const token = randomBytes(32).toString('hex')
          yield* repo
            .createVerification({ identifier: email, value: token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) })
            .pipe(Effect.orDie)
        }),

      resetPassword: (token, newPassword) =>
        Effect.gen(function* () {
          const verification = yield* repo.findVerificationByToken(token).pipe(Effect.orDie)

          if (Option.isNone(verification) || verification.value.expiresAt < new Date()) {
            return yield* Effect.fail(new InvalidResetToken())
          }

          const user = yield* repo.findUserByEmail(verification.value.identifier).pipe(Effect.orDie)
          if (Option.isNone(user)) return yield* Effect.fail(new InvalidResetToken())

          const passwordHash = yield* Effect.promise(() => argon2.hash(newPassword))

          yield* repo.updateAccountPassword(user.value.id, passwordHash).pipe(Effect.orDie)
          yield* repo.deleteVerification(verification.value.id).pipe(Effect.orDie)
          // A reset usually means a compromise concern — kill existing sessions
          // so a leaked cookie stops working immediately, not just future logins.
          yield* repo.deleteSessionsByUserId(user.value.id).pipe(Effect.orDie)
        }),
    }
  }),
)
