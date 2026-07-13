import { createServer } from 'node:http'
import 'dotenv/config'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Layer } from 'effect'
import { HttpRouter } from 'effect/unstable/http'
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi'
import { Api, HealthGroupLive } from '@/Api.js'
import { AppConfig, ServerConfig } from '@/infra/Config.js'
import { DatabaseLive } from '@/infra/Database.js'
import { LoggerLive } from '@/infra/Logger.js'
import { TelemetryLive } from '@/infra/Telemetry.js'

const AppRoutes = Layer.mergeAll(HttpApiBuilder.layer(Api), HttpApiScalar.layer(Api, { path: '/docs' })).pipe(
  Layer.provide(HealthGroupLive),
)

// HttpRouter.serve wires the base router + request-logging middleware in by default.
const HttpLive = HttpRouter.serve(AppRoutes).pipe(Layer.provide(NodeHttpServer.layerConfig(createServer, ServerConfig)))

// LoggerLive itself needs AppConfig (for nodeEnv/logLevel) — provideMerge so
// AppConfig.Live satisfies that internally while staying available downstream too.
const Infra = Layer.mergeAll(DatabaseLive, LoggerLive, TelemetryLive).pipe(Layer.provideMerge(AppConfig.Live))

const MainLive = HttpLive.pipe(Layer.provide(Infra))

NodeRuntime.runMain(Layer.launch(MainLive))
