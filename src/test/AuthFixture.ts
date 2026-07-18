import { ConfigProvider, Effect, Layer } from 'effect'
import { CredentialsRepo, CredentialsRepoLive } from '@/auth/CredentialsRepo.js'
import { sessionCookieSecurity, sign } from '@/auth/Cookie.js'
import type { UserRole } from '@/domain/schema/users.schema.js'
import { SessionConfig } from '@/infra/Config.js'
import { DatabaseTestLive } from '@/test/DbTestLayer.js'
import { TEST_COOKIE_SECRET } from '@/test/AppTestLayer.js'

const FixtureConfigLive = ConfigProvider.layer(
  ConfigProvider.fromUnknown({ COOKIE_SECRET: TEST_COOKIE_SECRET }),
)

const FixtureAuthLive = Layer.mergeAll(CredentialsRepoLive, SessionConfig.Live).pipe(
  Layer.provideMerge(DatabaseTestLive),
  Layer.provide(FixtureConfigLive),
)

let counter = 0
const uniqueEmail = () => `e2e-fixture-${Date.now()}-${counter++}@example.com`

export interface AuthFixture {
  readonly userId: string
  readonly email: string
  readonly cookieHeader: string
}

/** Creates a user with the given role and a valid signed session cookie for it, bypassing sign-up/sign-in HTTP. */
export const createAuthenticatedUser = (role: UserRole): Effect.Effect<AuthFixture> =>
  Effect.gen(function* () {
    const credentialsRepo = yield* CredentialsRepo
    const email = uniqueEmail()
    const user = yield* credentialsRepo.createUser({ email, name: 'E2E Fixture', role })
    const session = yield* credentialsRepo.createSession(user.id, new Date(Date.now() + 3_600_000))
    const signedToken = yield* sign(session.token)

    return {
      userId: user.id,
      email,
      cookieHeader: `${sessionCookieSecurity.key}=${signedToken}`,
    }
  }).pipe(Effect.provide(FixtureAuthLive), Effect.orDie)
