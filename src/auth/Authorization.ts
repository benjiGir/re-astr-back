import { eq } from 'drizzle-orm'
import { Effect, Layer, Redacted } from 'effect'
import { HttpApiError, HttpApiMiddleware } from 'effect/unstable/httpapi'
import { sessions } from '@/domain/schema/sessions.schema.js'
import { users } from '@/domain/schema/users.schema.js'
import { CurrentUser } from '@/auth/CurrentUser.js'
import { sessionCookieSecurity, verify } from '@/auth/Cookie.js'
import { SessionConfig } from '@/infra/Config.js'
import { Database } from '@/infra/Database.js'

/**
 * Establishes identity only (CurrentUser) — no role gating here, that's
 * Role.requireRole, called per-handler. One cookie scheme ("cookie" key in
 * `security`) reading the session token, verified against our own HMAC
 * (Cookie.verify), then resolved against `sessions`/`users`.
 */
export class Authorization extends HttpApiMiddleware.Service<Authorization, { provides: CurrentUser }>()(
  'Authorization',
  {
    error: HttpApiError.Unauthorized,
    security: {
      cookie: sessionCookieSecurity,
    },
  },
) {}

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const db = yield* Database
    // Resolved once at Layer-construction time so the per-request handler
    // below (whose requirement channel is restricted by the framework) can
    // provide it locally instead of yielding SessionConfig itself.
    const sessionConfig = yield* SessionConfig

    return {
      cookie: (httpEffect, { credential }) =>
        Effect.gen(function* () {
          const token = yield* verify(Redacted.value(credential)).pipe(
            Effect.provideService(SessionConfig, sessionConfig),
            Effect.mapError(() => new HttpApiError.Unauthorized()),
          )

          const [session] = yield* db
            .select()
            .from(sessions)
            .where(eq(sessions.token, token))
            .limit(1)
            .pipe(Effect.mapError(() => new HttpApiError.Unauthorized()))

          if (!session || session.expiresAt < new Date()) {
            return yield* new HttpApiError.Unauthorized()
          }

          const [user] = yield* db
            .select()
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1)
            .pipe(Effect.mapError(() => new HttpApiError.Unauthorized()))

          if (!user) return yield* new HttpApiError.Unauthorized()

          return yield* httpEffect.pipe(
            Effect.provideService(CurrentUser, {
              ...user,
              session: {
                id: session.id,
                token: session.token,
                expiresAt: session.expiresAt,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
              },
            }),
          )
        }),
    }
  }),
)
