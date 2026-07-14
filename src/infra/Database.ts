import { PgClient } from '@effect/sql-pg'
import { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import * as PgDrizzle from 'drizzle-orm/effect-postgres'
import { Cause, Context, Effect, Layer } from 'effect'
import { types } from 'pg'
import { DatabaseConfig } from '@/infra/Config.js'

/**
 * Postgres OIDs for date/time types. node-postgres (the driver under
 * @effect/sql-pg) parses these into JS Dates by default; returning the raw
 * string instead lets Drizzle's own column codecs do the parsing, matching
 * the setup documented at orm.drizzle.team/docs/connect-effect-postgres.
 */
const TEMPORAL_TYPE_OIDS = new Set([1082, 1083, 1114, 1115, 1182, 1184, 1185, 1186, 1187, 1231])

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
    const PgClientLive = PgClient.layer({
      url,
      types: {
        getTypeParser: (typeId, format) =>
          TEMPORAL_TYPE_OIDS.has(typeId)
            ? (value: unknown) => value
            : types.getTypeParser(typeId, format),
      },
    })

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
  const squashed = Cause.squash(error.cause as Cause.Cause<unknown>) as
    | { reason?: { _tag?: string } }
    | undefined
  return squashed?.reason?._tag
}
