import { describe, expect, it, vi } from '@effect/vitest'
import argon2 from 'argon2'
import { Effect, Layer, Option, Redacted } from 'effect'
import type { Account, NewAccount } from '@/domain/schema/accounts.schema.js'
import type { Session } from '@/domain/schema/sessions.schema.js'
import type { User } from '@/domain/schema/users.schema.js'
import type { Verification } from '@/domain/schema/verifications.schema.js'
import { CredentialsRepo } from '@/auth/CredentialsRepo.js'
import {
  Credentials,
  CredentialsLive,
  InvalidCredentials,
  InvalidResetToken,
} from '@/auth/Credentials.js'
import { SessionConfig } from '@/infra/Config.js'

const now = new Date('2026-01-01T00:00:00.000Z')

// Top-level await: this module runs under Vitest/ESM, both support it — avoids
// threading async hash setup through every Effect.gen test body below.
const correctPasswordHash = await argon2.hash('correct-password')

const mockUser: User = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  emailVerified: false,
  image: null,
  role: 'user',
  createdAt: now,
  updatedAt: now,
}

const mockAccount: Account = {
  id: 'account-1',
  accountId: 'user-1',
  providerId: 'credential',
  userId: 'user-1',
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  scope: null,
  password: correctPasswordHash,
  createdAt: now,
  updatedAt: now,
}

// expiresAt fields are relative to the real clock (Date.now()), not the fixed
// `now` above — Credentials.ts compares them against a real `new Date()` at
// runtime, so a fixture built off a fixed past date reads as already-expired
// once enough wall-clock time has passed since it was written.
const mockSession: Session = {
  id: 'session-1',
  expiresAt: new Date(Date.now() + 604_800_000),
  token: 'raw-token',
  ipAddress: null,
  userAgent: null,
  userId: 'user-1',
  createdAt: now,
  updatedAt: now,
}

const mockVerification: Verification = {
  id: 'verification-1',
  identifier: 'jane@example.com',
  value: 'reset-token',
  expiresAt: new Date(Date.now() + 3_600_000),
  createdAt: now,
  updatedAt: now,
}

const makeMockRepo = (overrides: Partial<typeof CredentialsRepo.Service> = {}) => ({
  findUserByEmail: vi.fn(() => Effect.succeed(Option.some(mockUser))),
  createUser: vi.fn(() => Effect.succeed(mockUser)),
  createAccount: vi.fn(() => Effect.void),
  findAccountByUserId: vi.fn(() => Effect.succeed(Option.some(mockAccount))),
  updateAccountPassword: vi.fn(() => Effect.void),
  createSession: vi.fn(() => Effect.succeed(mockSession)),
  deleteSession: vi.fn(() => Effect.void),
  deleteSessionsByUserId: vi.fn(() => Effect.void),
  createVerification: vi.fn(() => Effect.void),
  findVerificationByToken: vi.fn(() => Effect.succeed(Option.some(mockVerification))),
  deleteVerification: vi.fn(() => Effect.void),
  ...overrides,
})

const mockSessionConfig: typeof SessionConfig.Service = {
  cookieSecret: Redacted.make('test-secret'),
  expiresIn: 604_800,
  updateAge: 86_400,
}

const runWithRepo = <A, E>(
  repo: typeof CredentialsRepo.Service,
  effect: Effect.Effect<A, E, Credentials>,
) =>
  Effect.provide(
    effect,
    CredentialsLive.pipe(
      Layer.provide(Layer.succeed(CredentialsRepo, repo)),
      Layer.provide(Layer.succeed(SessionConfig, mockSessionConfig)),
    ),
  )

describe('Credentials', () => {
  // EmailAlreadyExists (UniqueViolation → 409) isn't unit-tested here, same as
  // ProjectNameConflict/CategoryHasTests elsewhere in this codebase — faking a
  // real EffectDrizzleQueryError's Cause shape precisely enough for
  // sqlReasonTag to read it is more trouble than it's worth; verified live instead.
  describe('signUp', () => {
    it.effect('creates the user, hashes the password, and opens a session', () => {
      let capturedAccount: NewAccount | undefined
      const createAccountFn = vi.fn((input: NewAccount) => {
        capturedAccount = input
        return Effect.void
      })

      return runWithRepo(
        makeMockRepo({ createAccount: createAccountFn }),
        Effect.gen(function* () {
          const credentials = yield* Credentials
          const result = yield* credentials.signUp(
            'jane@example.com',
            'correct-password',
            'Jane Doe',
          )

          expect(result.user.id).toBe('user-1')
          expect(result.session.id).toBe('session-1')

          const verified = yield* Effect.promise(() =>
            argon2.verify(capturedAccount?.password ?? '', 'correct-password'),
          )
          expect(verified).toBe(true)
        }),
      )
    })
  })

  describe('signIn', () => {
    it.effect('fails with InvalidCredentials when the email is unknown', () =>
      runWithRepo(
        makeMockRepo({ findUserByEmail: vi.fn(() => Effect.succeed(Option.none())) }),
        Effect.gen(function* () {
          const credentials = yield* Credentials
          const error = yield* Effect.flip(credentials.signIn('unknown@example.com', 'whatever'))
          expect(error).toBeInstanceOf(InvalidCredentials)
        }),
      ),
    )

    it.effect(
      'fails with InvalidCredentials when the account has no password (e.g. OAuth-only)',
      () =>
        runWithRepo(
          makeMockRepo({ findAccountByUserId: vi.fn(() => Effect.succeed(Option.none())) }),
          Effect.gen(function* () {
            const credentials = yield* Credentials
            const error = yield* Effect.flip(credentials.signIn('jane@example.com', 'whatever'))
            expect(error).toBeInstanceOf(InvalidCredentials)
          }),
        ),
    )

    it.effect('fails with InvalidCredentials when the password is wrong', () =>
      runWithRepo(
        makeMockRepo(),
        Effect.gen(function* () {
          const credentials = yield* Credentials
          const error = yield* Effect.flip(credentials.signIn('jane@example.com', 'wrong-password'))
          expect(error).toBeInstanceOf(InvalidCredentials)
        }),
      ),
    )

    it.effect('succeeds and opens a session when the password matches', () =>
      runWithRepo(
        makeMockRepo(),
        Effect.gen(function* () {
          const credentials = yield* Credentials
          const result = yield* credentials.signIn('jane@example.com', 'correct-password')
          expect(result.user.id).toBe('user-1')
          expect(result.session.token).toBe('raw-token')
        }),
      ),
    )
  })

  describe('signOut', () => {
    it.effect('deletes the session', () => {
      const deleteSessionFn = vi.fn(() => Effect.void)

      return runWithRepo(
        makeMockRepo({ deleteSession: deleteSessionFn }),
        Effect.gen(function* () {
          const credentials = yield* Credentials
          yield* credentials.signOut('session-1')
          expect(deleteSessionFn).toHaveBeenCalledWith('session-1')
        }),
      )
    })
  })

  describe('requestPasswordReset', () => {
    it.effect('stores a verification token when the email is known', () => {
      const createVerificationFn = vi.fn(() => Effect.void)

      return runWithRepo(
        makeMockRepo({ createVerification: createVerificationFn }),
        Effect.gen(function* () {
          const credentials = yield* Credentials
          yield* credentials.requestPasswordReset('jane@example.com')
          expect(createVerificationFn).toHaveBeenCalledWith(
            expect.objectContaining({ identifier: 'jane@example.com' }),
          )
        }),
      )
    })

    it.effect(
      'does nothing (but still succeeds) when the email is unknown — no enumeration',
      () => {
        const createVerificationFn = vi.fn(() => Effect.void)

        return runWithRepo(
          makeMockRepo({
            findUserByEmail: vi.fn(() => Effect.succeed(Option.none())),
            createVerification: createVerificationFn,
          }),
          Effect.gen(function* () {
            const credentials = yield* Credentials
            yield* credentials.requestPasswordReset('unknown@example.com')
            expect(createVerificationFn).not.toHaveBeenCalled()
          }),
        )
      },
    )
  })

  describe('resetPassword', () => {
    it.effect('fails with InvalidResetToken when the token is unknown', () =>
      runWithRepo(
        makeMockRepo({ findVerificationByToken: vi.fn(() => Effect.succeed(Option.none())) }),
        Effect.gen(function* () {
          const credentials = yield* Credentials
          const error = yield* Effect.flip(credentials.resetPassword('bad-token', 'newpassword123'))
          expect(error).toBeInstanceOf(InvalidResetToken)
        }),
      ),
    )

    it.effect('fails with InvalidResetToken when the token has expired', () =>
      runWithRepo(
        makeMockRepo({
          findVerificationByToken: vi.fn(() =>
            Effect.succeed(
              Option.some({ ...mockVerification, expiresAt: new Date(Date.now() - 1000) }),
            ),
          ),
        }),
        Effect.gen(function* () {
          const credentials = yield* Credentials
          const error = yield* Effect.flip(
            credentials.resetPassword('reset-token', 'newpassword123'),
          )
          expect(error).toBeInstanceOf(InvalidResetToken)
        }),
      ),
    )

    it.effect('updates the password, deletes the token, and kills existing sessions', () => {
      let capturedUserId: string | undefined
      let capturedHash: string | undefined
      const updatePasswordFn = vi.fn((userId: string, password: string) => {
        capturedUserId = userId
        capturedHash = password
        return Effect.void
      })
      const deleteVerificationFn = vi.fn(() => Effect.void)
      const deleteSessionsFn = vi.fn(() => Effect.void)

      return runWithRepo(
        makeMockRepo({
          updateAccountPassword: updatePasswordFn,
          deleteVerification: deleteVerificationFn,
          deleteSessionsByUserId: deleteSessionsFn,
        }),
        Effect.gen(function* () {
          const credentials = yield* Credentials
          yield* credentials.resetPassword('reset-token', 'newpassword123')

          expect(capturedUserId).toBe('user-1')
          const verified = yield* Effect.promise(() =>
            argon2.verify(capturedHash ?? '', 'newpassword123'),
          )
          expect(verified).toBe(true)
          expect(deleteVerificationFn).toHaveBeenCalledWith('verification-1')
          expect(deleteSessionsFn).toHaveBeenCalledWith('user-1')
        }),
      )
    })
  })
})
