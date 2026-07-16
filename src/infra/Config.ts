import { Config, Context, Effect, Layer, type LogLevel, type Redacted } from 'effect'

export class AppConfig extends Context.Service<
  AppConfig,
  {
    readonly nodeEnv: 'development' | 'production' | 'test'
    readonly logLevel: LogLevel.LogLevel
  }
>()('AppConfig') {
  static readonly Live = Layer.effect(
    AppConfig,
    Effect.gen(function* () {
      const nodeEnv = yield* Config.literals(['development', 'production', 'test'], 'NODE_ENV').pipe(
        Config.withDefault('development' as const),
      )
      const logLevel = yield* Config.logLevel('LOG_LEVEL').pipe(
        Config.withDefault(nodeEnv === 'production' ? 'Info' : 'Debug'),
      )

      return { nodeEnv, logLevel }
    }),
  )
}

export const DatabaseConfig = {
  url: Config.redacted('DATABASE_URL'),
}

export const ServerConfig = {
  port: Config.int('PORT').pipe(Config.withDefault(3000)),
}

/** Vite dev server default — the only trusted origin in the pre-rewrite Better Auth config too. */
export const CorsConfig = {
  allowedOrigin: Config.string('CORS_ORIGIN').pipe(Config.withDefault('http://localhost:5173')),
}

export const MinioConfig = {
  endPoint: Config.string('MINIO_ENDPOINT').pipe(Config.withDefault('localhost')),
  port: Config.int('MINIO_PORT').pipe(Config.withDefault(9000)),
  useSSL: Config.boolean('MINIO_USE_SSL').pipe(Config.withDefault(false)),
  accessKey: Config.redacted('MINIO_ACCESS_KEY'),
  secretKey: Config.redacted('MINIO_SECRET_KEY'),
}

/**
 * No `withDefault` on `cookieSecret`: boot must fail loudly if it's missing,
 * instead of silently falling back to a known hardcoded string (the bug this replaces).
 */
export class SessionConfig extends Context.Service<
  SessionConfig,
  {
    readonly cookieSecret: Redacted.Redacted<string>
    readonly expiresIn: number
    readonly updateAge: number
  }
>()('SessionConfig') {
  static readonly Live = Layer.effect(
    SessionConfig,
    Effect.gen(function* () {
      const cookieSecret = yield* Config.redacted('COOKIE_SECRET')
      const expiresIn = yield* Config.int('AUTH_SESSION_EXPIRES').pipe(Config.withDefault(604800))
      const updateAge = yield* Config.int('AUTH_SESSION_UPDATE_AGE').pipe(Config.withDefault(86400))

      return { cookieSecret, expiresIn, updateAge }
    }),
  )
}
