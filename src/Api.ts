import { Effect, Schema } from 'effect'
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiError, HttpApiGroup } from 'effect/unstable/httpapi'
import { users } from '@/domain/schema/users.schema.js'
import { Database } from '@/infra/Database.js'

export class ServiceCheck extends Schema.Class<ServiceCheck>('ServiceCheck')({
  status: Schema.Literals(['up', 'down']),
  responseTimeMs: Schema.Number,
}) {}

export class HealthResponse extends Schema.Class<HealthResponse>('HealthResponse')({
  status: Schema.Literal('healthy'),
  timestamp: Schema.String,
  uptime: Schema.Number,
}) {}

export class ReadinessResponse extends Schema.Class<ReadinessResponse>('ReadinessResponse')({
  status: Schema.Literal('ready'),
  services: Schema.Struct({ database: ServiceCheck }),
}) {}

const HealthGroup = HttpApiGroup.make('health')
  .add(HttpApiEndpoint.get('check', '/health', { success: HealthResponse }))
  .add(
    HttpApiEndpoint.get('ready', '/health/ready', {
      success: ReadinessResponse,
      error: HttpApiError.ServiceUnavailable,
    }),
  )

// storage (Minio) isn't wired until Phase 4 — readiness only covers the database for now.
export class Api extends HttpApi.make('re-astr').add(HealthGroup) {}

export const HealthGroupLive = HttpApiBuilder.group(Api, 'health', (handlers) =>
  handlers
    .handle('check', () =>
      Effect.succeed(
        new HealthResponse({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        }),
      ),
    )
    .handle('ready', () =>
      Effect.gen(function* () {
        const db = yield* Database
        const start = Date.now()

        const database = yield* db
          .select({ id: users.id })
          .from(users)
          .limit(1)
          .pipe(
            Effect.as({ status: 'up' as const, responseTimeMs: Date.now() - start }),
            Effect.catchCause(() => Effect.succeed({ status: 'down' as const, responseTimeMs: Date.now() - start })),
          )

        if (database.status === 'down') {
          return yield* new HttpApiError.ServiceUnavailable()
        }

        return new ReadinessResponse({ status: 'ready', services: { database } })
      }),
    ),
)
