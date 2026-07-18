import { NodeHttpServer } from '@effect/platform-node'
import { ConfigProvider, Layer } from 'effect'
import { HttpRouter } from 'effect/unstable/http'
import { AppRoutes, Infra } from '@/App.js'
import { readTestEnv } from '@/test/testEnv.js'

// Shared with AuthFixture.ts, which signs session cookies outside the HTTP
// layer — both sides must use the same secret for Cookie.verify to accept them.
export const TEST_COOKIE_SECRET = 'e2e-test-cookie-secret-not-for-production-use'

const TestConfigLive = ConfigProvider.layer(
  ConfigProvider.fromUnknown({
    ...readTestEnv(),
    COOKIE_SECRET: TEST_COOKIE_SECRET,
    NODE_ENV: 'test',
    LOG_LEVEL: 'Error',
  }),
)

const AppTestLayerUntyped = HttpRouter.serve(AppRoutes).pipe(
  Layer.provide(Infra),
  Layer.provide(TestConfigLive),
  Layer.provideMerge(NodeHttpServer.layerTest),
)

/**
 * Boots the real app (routes + services) on an ephemeral port against the
 * containerized test Postgres/MinIO, and exposes an `HttpClient` pre-wired to
 * that server's address — yield `HttpClient.HttpClient` in tests to call it.
 *
 * Same `unknown`-requirement inference gap as `App.ts`'s `MainLive` cast
 * (HttpRouter.serve's HE/HR type params collapse to `unknown` without an
 * explicit `middleware` option) — this cast restores it for the type checker.
 */
export const AppTestLayer = AppTestLayerUntyped as unknown as Layer.Layer<
  Layer.Success<typeof AppTestLayerUntyped>,
  Layer.Error<typeof AppTestLayerUntyped>,
  never
>
