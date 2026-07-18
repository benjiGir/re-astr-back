import { createServer } from 'node:http'
import { NodeHttpServer } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { HttpRouter } from 'effect/unstable/http'
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi'
import { Api, HealthGroupLive } from '@/Api.js'
import { AuthGroupLive, AuthSessionGroupLive } from '@/auth/AuthHttp.js'
import { AuthorizationLive } from '@/auth/Authorization.js'
import { CredentialsLive } from '@/auth/Credentials.js'
import { CredentialsRepoLive } from '@/auth/CredentialsRepo.js'
import { AppConfig, CorsConfig, ServerConfig, SessionConfig } from '@/infra/Config.js'
import { DatabaseLive } from '@/infra/Database.js'
import { LoggerLive } from '@/infra/Logger.js'
import { StorageLive } from '@/infra/Storage.js'
import { TelemetryLive } from '@/infra/Telemetry.js'
import { CategoriesGroupLive } from '@/modules/categories/CategoriesHttp.js'
import { CategoriesRepoLive } from '@/modules/categories/CategoriesRepo.js'
import { CategoriesServiceLive } from '@/modules/categories/CategoriesService.js'
import { ProjectsGroupLive } from '@/modules/projects/ProjectsHttp.js'
import { ProjectsRepoLive } from '@/modules/projects/ProjectsRepo.js'
import { ProjectsServiceLive } from '@/modules/projects/ProjectsService.js'
import { TestFilesGroupLive } from '@/modules/test-files/TestFilesHttp.js'
import { TestFilesRepoLive } from '@/modules/test-files/TestFilesRepo.js'
import { TestFilesServiceLive } from '@/modules/test-files/TestFilesService.js'
import { TestsGroupLive } from '@/modules/tests/TestsHttp.js'
import { TestsRepoLive } from '@/modules/tests/TestsRepo.js'
import { TestsServiceLive } from '@/modules/tests/TestsService.js'
import { UsersGroupLive } from '@/modules/users/UsersHttp.js'
import { UsersRepoLive } from '@/modules/users/UsersRepo.js'
import { UsersServiceLive } from '@/modules/users/UsersService.js'

// Router-level global middleware (not an HttpApi security concern) — must be merged into the same
// appLayer passed to HttpRouter.serve so it registers on the HttpRouter instance serve() creates.
const CorsLive = Layer.unwrap(
  Effect.gen(function* () {
    const allowedOrigin = yield* CorsConfig.allowedOrigin
    return HttpRouter.cors({ allowedOrigins: [allowedOrigin], credentials: true })
  }),
)

/** All HTTP routes, wired to their group handlers — everything `HttpRouter.serve` needs except a concrete `HttpServer`. */
export const AppRoutes = Layer.mergeAll(
  HttpApiBuilder.layer(Api),
  HttpApiScalar.layer(Api, { path: '/docs' }),
  CorsLive,
).pipe(
  Layer.provide(HealthGroupLive),
  Layer.provide(AuthGroupLive),
  Layer.provide(AuthSessionGroupLive),
  Layer.provide(ProjectsGroupLive),
  Layer.provide(CategoriesGroupLive),
  Layer.provide(TestsGroupLive),
  Layer.provide(TestFilesGroupLive),
  Layer.provide(UsersGroupLive),
)

const ProjectsInfra = ProjectsServiceLive.pipe(Layer.provide(ProjectsRepoLive))
const CategoriesInfra = CategoriesServiceLive.pipe(Layer.provide(CategoriesRepoLive))
const TestsInfra = TestsServiceLive.pipe(Layer.provide(TestsRepoLive))
const TestFilesInfra = TestFilesServiceLive.pipe(Layer.provide(TestFilesRepoLive))
const CredentialsInfra = CredentialsLive.pipe(Layer.provide(CredentialsRepoLive))
const UsersInfra = UsersServiceLive.pipe(Layer.provide(UsersRepoLive))

// Each provideMerge both satisfies a shared dependency AND keeps it visible in
// the output, so later provideMerge calls / other siblings needing the same
// service still find it (see docs/EFFECT_MIGRATION.md §9 — mergeAll alone
// does NOT let siblings satisfy each other's requirements). Chain keeps
// growing the same way: TestFilesInfra needs TestsService (test existence
// checks) and Storage, so TestsInfra moves out to provideMerge too, alongside
// Projects/CategoriesInfra it already needed.
export const Infra = Layer.mergeAll(
  LoggerLive,
  TelemetryLive,
  AuthorizationLive,
  CredentialsInfra,
  TestFilesInfra,
  UsersInfra,
).pipe(
  Layer.provideMerge(TestsInfra),
  Layer.provideMerge(ProjectsInfra),
  Layer.provideMerge(CategoriesInfra),
  Layer.provideMerge(StorageLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(SessionConfig.Live),
  Layer.provideMerge(AppConfig.Live),
)

// HttpRouter.serve wires the base router + request-logging middleware in by default.
const HttpLive = HttpRouter.serve(AppRoutes).pipe(
  Layer.provide(NodeHttpServer.layerConfig(createServer, ServerConfig)),
)

// Effect v4 beta (.97) type-inference gap, not a real missing dependency: HttpRouter.serve's
// `HE`/`HR` type params are only inferable from an explicit `middleware` option; we don't pass
// one, so their conditional-type defaults never resolve and collapse to `unknown`. That `unknown`
// then poisons RIn through every later Layer.provide, since `Exclude<unknown, X>` can't distribute
// (unknown isn't a union) and stays `unknown` instead of narrowing to `never`. Infra genuinely
// provides everything HttpLive still asks for — confirmed by isolating each layer's requirement
// with a direct `Layer.Layer<any, any, never>` type-check (Infra alone passes; only the
// HttpRouter.serve-derived branch reports `unknown`), and by booting the server. This cast just
// restores that to the type checker.
const MainLiveUntyped = HttpLive.pipe(Layer.provide(Infra))
export const MainLive = MainLiveUntyped as unknown as Layer.Layer<
  Layer.Success<typeof MainLiveUntyped>,
  Layer.Error<typeof MainLiveUntyped>,
  never
>
