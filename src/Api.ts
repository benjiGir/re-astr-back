import { Effect, Schema } from 'effect'
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiError, HttpApiGroup } from 'effect/unstable/httpapi'
import { users } from '@/domain/schema/users.schema.js'
import { AuthGroup, AuthSessionGroup } from '@/auth/AuthHttp.js'
import { Database } from '@/infra/Database.js'
import { CategoriesGroup } from '@/modules/categories/CategoriesHttp.js'
import { ProjectsGroup } from '@/modules/projects/ProjectsHttp.js'
import { TestFilesGroup } from '@/modules/test-files/TestFilesHttp.js'
import { TestsGroup } from '@/modules/tests/TestsHttp.js'
import { UsersGroup } from '@/modules/users/UsersHttp.js'

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

// Storage (Minio) is wired below (Phase 4) but /health/ready still only checks the
// database — a Minio check would need Minio as a dependency of the health group too;
// left out deliberately to keep this phase scoped to test-files, not the health system.
export class Api extends HttpApi.make('re-astr')
  .add(HealthGroup)
  .add(AuthGroup)
  .add(AuthSessionGroup)
  .add(ProjectsGroup)
  .add(CategoriesGroup)
  .add(TestsGroup)
  .add(TestFilesGroup)
  .add(UsersGroup) {}

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
