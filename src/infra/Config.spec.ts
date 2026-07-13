import { describe, expect, it } from '@effect/vitest'
import { ConfigProvider, Effect, Exit } from 'effect'
import { SessionConfig } from '@/infra/Config.js'

describe('SessionConfig', () => {
  it.effect('fails to resolve when COOKIE_SECRET is missing (no hardcoded fallback)', () =>
    Effect.gen(function* () {
      const program = Effect.provide(SessionConfig, SessionConfig.Live)
      const exit = yield* Effect.exit(program.pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({})))))

      expect(Exit.isFailure(exit)).toBe(true)
    }),
  )

  it.effect('resolves with the documented session defaults when COOKIE_SECRET is present', () =>
    Effect.gen(function* () {
      const program = Effect.provide(SessionConfig, SessionConfig.Live)
      const configProvider = ConfigProvider.fromUnknown({ COOKIE_SECRET: 'test-secret' })
      const session = yield* program.pipe(Effect.provide(ConfigProvider.layer(configProvider)))

      expect(session.expiresIn).toBe(604800)
      expect(session.updateAge).toBe(86400)
    }),
  )
})
