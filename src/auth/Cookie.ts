import { createHmac, timingSafeEqual } from 'node:crypto'
import { Data, Effect, Redacted } from 'effect'
import { HttpApiSecurity } from 'effect/unstable/httpapi'
import { SessionConfig } from '@/infra/Config.js'

export class InvalidCookie extends Data.TaggedError('InvalidCookie') {}

/** Shared by Authorization (reads it) and AuthHttp (sets/clears it on sign-in/up/out). */
export const sessionCookieSecurity = HttpApiSecurity.apiKey({ key: 'better-auth.session_token', in: 'cookie' })

/**
 * Own signing scheme, not compatible with the old Better Auth cookies (see
 * docs/EFFECT_MIGRATION.md §5/§7 — active sessions get invalidated at cutover).
 * Value shape: `${token}.${hmac(token)}`, base64url-encoded signature.
 */
const signature = (secret: string, token: string): string => createHmac('sha256', secret).update(token).digest('base64url')

export const sign = Effect.fn('Cookie.sign')(function* (token: string) {
  const { cookieSecret } = yield* SessionConfig
  return `${token}.${signature(Redacted.value(cookieSecret), token)}`
})

export const verify = Effect.fn('Cookie.verify')(function* (cookieValue: string) {
  const separator = cookieValue.lastIndexOf('.')
  if (separator === -1) return yield* new InvalidCookie()

  const token = cookieValue.slice(0, separator)
  const providedSignature = cookieValue.slice(separator + 1)
  const { cookieSecret } = yield* SessionConfig
  const expectedSignature = signature(Redacted.value(cookieSecret), token)

  const expected = Buffer.from(expectedSignature)
  const provided = Buffer.from(providedSignature)
  const valid = expected.length === provided.length && timingSafeEqual(expected, provided)

  return valid ? token : yield* new InvalidCookie()
})
