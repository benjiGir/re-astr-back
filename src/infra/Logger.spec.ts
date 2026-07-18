import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { AppConfig } from '@/infra/Config.js'
import { formatMessage, LoggerLive, redact } from '@/infra/Logger.js'

describe('redact', () => {
  it('passes non-sensitive keys through unchanged', () => {
    expect(redact({ userId: 'user-1', requestId: 'req-1' })).toEqual({
      userId: 'user-1',
      requestId: 'req-1',
    })
  })

  it('redacts known sensitive keys case-insensitively', () => {
    expect(
      redact({
        Authorization: 'Bearer abc',
        cookie: 'session=abc',
        'Set-Cookie': 'session=abc',
        password: 'hunter2',
        confirmPassword: 'hunter2',
        currentPassword: 'hunter2',
        newPassword: 'hunter2',
        userId: 'user-1',
      }),
    ).toEqual({
      Authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      'Set-Cookie': '[REDACTED]',
      password: '[REDACTED]',
      confirmPassword: '[REDACTED]',
      currentPassword: '[REDACTED]',
      newPassword: '[REDACTED]',
      userId: 'user-1',
    })
  })
})

describe('formatMessage', () => {
  it('returns a plain string message unchanged', () => {
    expect(formatMessage('hello')).toBe('hello')
  })

  it('unwraps a single-element array before formatting', () => {
    expect(formatMessage(['hello'])).toBe('hello')
  })

  it('inspects a multi-element array instead of unwrapping it', () => {
    expect(formatMessage(['a', 'b'])).toBe("[ 'a', 'b' ]")
  })

  it('inspects non-string messages', () => {
    expect(formatMessage({ userId: 'user-1' })).toBe("{ userId: 'user-1' }")
  })
})

describe('LoggerLive', () => {
  it.effect('emits JSON lines in production', () =>
    Effect.gen(function* () {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      try {
        yield* Effect.logInfo('hello').pipe(
          Effect.provide(
            LoggerLive.pipe(
              Layer.provide(Layer.succeed(AppConfig, { nodeEnv: 'production', logLevel: 'Info' })),
            ),
          ),
        )
        expect(logSpy).toHaveBeenCalledTimes(1)
        const entry = JSON.parse(logSpy.mock.calls[0]?.[0] as string)
        expect(entry).toMatchObject({ level: 'Info', message: 'hello' })
      } finally {
        logSpy.mockRestore()
      }
    }),
  )
})
