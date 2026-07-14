import { createServer } from 'node:http'
import 'dotenv/config'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Layer } from 'effect'
import { HttpRouter } from 'effect/unstable/http'
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi'
import { Api, HealthGroupLive } from '@/Api.js'
import { AuthorizationLive } from '@/auth/Authorization.js'
import { AppConfig, ServerConfig, SessionConfig } from '@/infra/Config.js'
import { DatabaseLive } from '@/infra/Database.js'
import { LoggerLive } from '@/infra/Logger.js'
import { TelemetryLive } from '@/infra/Telemetry.js'
import { CategoriesGroupLive } from '@/modules/categories/CategoriesHttp.js'
import { CategoriesRepoLive } from '@/modules/categories/CategoriesRepo.js'
import { CategoriesServiceLive } from '@/modules/categories/CategoriesService.js'
import { ProjectsGroupLive } from '@/modules/projects/ProjectsHttp.js'
import { ProjectsRepoLive } from '@/modules/projects/ProjectsRepo.js'
import { ProjectsServiceLive } from '@/modules/projects/ProjectsService.js'

const AppRoutes = Layer.mergeAll(HttpApiBuilder.layer(Api), HttpApiScalar.layer(Api, { path: '/docs' })).pipe(
  Layer.provide(HealthGroupLive),
  Layer.provide(ProjectsGroupLive),
  Layer.provide(CategoriesGroupLive),
)

// HttpRouter.serve wires the base router + request-logging middleware in by default.
const HttpLive = HttpRouter.serve(AppRoutes).pipe(Layer.provide(NodeHttpServer.layerConfig(createServer, ServerConfig)))

const ProjectsInfra = ProjectsServiceLive.pipe(Layer.provide(ProjectsRepoLive))
const CategoriesInfra = CategoriesServiceLive.pipe(Layer.provide(CategoriesRepoLive))

// Each provideMerge both satisfies a shared dependency (Database, AppConfig)
// AND keeps it visible in the output, so later provideMerge calls / other
// siblings needing the same service still find it (see docs/EFFECT_MIGRATION.md
// §9 — mergeAll alone does NOT let siblings satisfy each other's requirements).
const Infra = Layer.mergeAll(LoggerLive, TelemetryLive, AuthorizationLive, ProjectsInfra, CategoriesInfra).pipe(
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(SessionConfig.Live),
  Layer.provideMerge(AppConfig.Live),
)

const MainLive = HttpLive.pipe(Layer.provide(Infra))

NodeRuntime.runMain(Layer.launch(MainLive))
