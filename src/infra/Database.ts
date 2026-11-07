import { PgClient } from '@effect/sql-pg'
import { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import * as PgDrizzle from 'drizzle-orm/effect-postgres'
import { Cause, Context, Effect, Layer } from 'effect'
import { DatabaseConfig } from '@/infra/Config.js'

// No `relations`/`schema` config: repositories pass table objects directly to
// `.from(table)`, never through `db.query.*` — that's the only thing schema
// wiring would buy here. Add `defineRelations()` when Phase 2+ needs it.
const dbEffect = PgDrizzle.makeWithDefaults()

export class Database extends Context.Service<Database, Effect.Success<typeof dbEffect>>()(
  'Database',
) {}

const DatabaseServiceLive = Layer.effect(Database, dbEffect)

/**
 * Single pool for the whole app (the NestJS version had two: DatabaseService's
 * and AuthService's own).
 */
export const DatabaseLive = Layer.unwrap(
  Effect.gen(function* () {
    const url = yield* DatabaseConfig.url
    // No type-parser override: since 4.1, @effect/sql-pg has its own binary
    // driver (no node-postgres). Drizzle casts `timestamp` columns to text in
    // SQL and parses them itself, so the default codecs are fine.
    const PgClientLive = PgClient.layer({ url })

    return DatabaseServiceLive.pipe(Layer.provideMerge(PgClientLive))
  }),
)

/**
 * @effect/sql-pg classifies Postgres errors into a tagged `reason` (e.g.
 * `UniqueViolation`, `ConstraintError`) inside a `SqlError`. Drizzle then
 * wraps *that* into `EffectDrizzleQueryError.cause`, which is a `Cause<unknown>`
 * at runtime (`Cause.fail(sqlError)`) even though its schema type is `Unknown`.
 * `Cause.squash` unwraps the Cause back down to the SqlError so we can read
 * `.reason._tag` — see docs/EFFECT_MIGRATION.md §9.
 */
export const sqlReasonTag = (error: EffectDrizzleQueryError): string | undefined => {
  if (!Cause.isCause(error.cause)) return undefined

  const squashed = Cause.squash(error.cause)
  if (typeof squashed !== 'object' || squashed === null || !('reason' in squashed)) return undefined

  const reason = squashed.reason
  if (typeof reason !== 'object' || reason === null || !('_tag' in reason)) return undefined

  const tag = reason._tag
  return typeof tag === 'string' ? tag : undefined
}
