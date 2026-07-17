import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit, Redacted } from 'effect'
import { sign, verify } from '@/auth/Cookie.js'
import { SessionConfig } from '@/infra/Config.js'

const TestSessionConfig = {
  cookieSecret: Redacted.make('test-secret'),
  expiresIn: 604800,
  updateAge: 86400,
}

const withTestConfig = Effect.provideService(SessionConfig, TestSessionConfig)

describe('Cookie', () => {
  it.effect('round-trips a signed token back to its original value', () =>
    Effect.gen(function* () {
      const signed = yield* sign('my-token').pipe(withTestConfig)
      const verified = yield* verify(signed).pipe(withTestConfig)

      expect(verified).toBe('my-token')
    }),
  )

  it.effect('rejects a tampered signature', () =>
    Effect.gen(function* () {
      const signed = yield* sign('my-token').pipe(withTestConfig)
      const exit = yield* Effect.exit(verify(`${signed}tampered`).pipe(withTestConfig))

      expect(Exit.isFailure(exit)).toBe(true)
    }),
  )

  it.effect('rejects a value with no signature separator', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(verify('no-signature-here').pipe(withTestConfig))

      expect(Exit.isFailure(exit)).toBe(true)
    }),
  )

  it.effect('rejects a token signed with a different secret', () =>
    Effect.gen(function* () {
      const signed = yield* sign('my-token').pipe(withTestConfig)
      const exit = yield* Effect.exit(
        verify(signed).pipe(
          Effect.provideService(SessionConfig, {
            ...TestSessionConfig,
            cookieSecret: Redacted.make('other-secret'),
          }),
        ),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    }),
  )
})
