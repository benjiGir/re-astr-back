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
      const nodeEnv = yield* Config.Literals(
        ['development', 'production', 'test'],
        'NODE_ENV',
      ).pipe(Config.withDefault('development' as const))
      const logLevel = yield* Config.LogLevel('LOG_LEVEL').pipe(
        Config.withDefault(nodeEnv === 'production' ? 'Info' : 'Debug'),
      )

      return { nodeEnv, logLevel }
    }),
  )
}

export const DatabaseConfig = {
  url: Config.Redacted('DATABASE_URL'),
}

export const ServerConfig = {
  port: Config.Int('PORT').pipe(Config.withDefault(3000)),
}

/** Vite dev server default — the only trusted origin in the pre-rewrite Better Auth config too. */
export const CorsConfig = {
  allowedOrigin: Config.String('CORS_ORIGIN').pipe(Config.withDefault('http://localhost:5173')),
}

/** Full OTLP traces path, not just a host — the exporter sends the url as-is, it doesn't append `/v1/traces` itself. */
export const TelemetryConfig = {
  enabled: Config.Boolean('TELEMETRY_ENABLED').pipe(Config.withDefault(true)),
  otlpEndpoint: Config.String('TELEMETRY_OTLP_ENDPOINT').pipe(
    Config.withDefault('http://localhost:4318/v1/traces'),
  ),
}

/** Garage (or any S3-compatible backend) has no real region — value is required by the SDK but unused. */
export const StorageConfig = {
  endpoint: Config.String('STORAGE_ENDPOINT').pipe(Config.withDefault('http://localhost:3900')),
  region: Config.String('STORAGE_REGION').pipe(Config.withDefault('garage')),
  accessKeyId: Config.Redacted('STORAGE_ACCESS_KEY_ID'),
  secretAccessKey: Config.Redacted('STORAGE_SECRET_ACCESS_KEY'),
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
      const cookieSecret = yield* Config.Redacted('COOKIE_SECRET')
      const expiresIn = yield* Config.Int('AUTH_SESSION_EXPIRES').pipe(Config.withDefault(604800))
      const updateAge = yield* Config.Int('AUTH_SESSION_UPDATE_AGE').pipe(Config.withDefault(86400))

      return { cookieSecret, expiresIn, updateAge }
    }),
  )
}
