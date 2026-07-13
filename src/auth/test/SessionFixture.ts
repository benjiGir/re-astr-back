import { randomUUID } from 'node:crypto'
import { Effect } from 'effect'
import { sessions } from '@/domain/schema/sessions.schema.js'
import { sign } from '@/auth/Cookie.js'
import { Database } from '@/infra/Database.js'

/**
 * Inserts a real session row for `userId` and returns a validly-signed
 * cookie value for it — no login flow exists yet (that's Phase 5), so this
 * is how protected endpoints get exercised until then.
 */
export const createSessionCookie = (userId: string) =>
  Effect.gen(function* () {
    const db = yield* Database
    const token = randomUUID()

    yield* db.insert(sessions).values({
      token,
      userId,
      expiresAt: new Date(Date.now() + 3_600_000),
    })

    return yield* sign(token)
  })
