import type { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import { Cause, Context, Effect, Layer, Option } from 'effect'
import {
  CreateProject,
  Project,
  ProjectHasTests,
  ProjectNameConflict,
  ProjectNotFound,
  type UpdateProject,
} from '@/modules/projects/Project.js'
import { ProjectsRepo } from '@/modules/projects/ProjectsRepo.js'

/**
 * @effect/sql-pg classifies Postgres errors into a tagged `reason` (e.g.
 * `UniqueViolation`, `ConstraintError`) inside a `SqlError`. Drizzle then
 * wraps *that* into `EffectDrizzleQueryError.cause`, which is a `Cause<unknown>`
 * at runtime (`Cause.fail(sqlError)`) even though its schema type is `Unknown`.
 * `Cause.squash` unwraps the Cause back down to the SqlError so we can read
 * `.reason._tag` — see docs/EFFECT_MIGRATION.md §9.
 */
const sqlReasonTag = (error: EffectDrizzleQueryError): string | undefined => {
  const squashed = Cause.squash(error.cause as Cause.Cause<unknown>) as { reason?: { _tag?: string } } | undefined
  return squashed?.reason?._tag
}

export class ProjectsService extends Context.Service<
  ProjectsService,
  {
    readonly create: (input: CreateProject) => Effect.Effect<Project, ProjectNameConflict>
    readonly findAll: () => Effect.Effect<Project[]>
    readonly findOne: (id: string) => Effect.Effect<Project, ProjectNotFound>
    readonly update: (id: string, input: UpdateProject) => Effect.Effect<Project, ProjectNotFound | ProjectNameConflict>
    readonly remove: (id: string) => Effect.Effect<void, ProjectNotFound | ProjectHasTests>
  }
>()('ProjectsService') {}

export const ProjectsServiceLive = Layer.effect(
  ProjectsService,
  Effect.gen(function* () {
    const repo = yield* ProjectsRepo

    const findOne = (id: string): Effect.Effect<Project, ProjectNotFound> =>
      repo.findById(id).pipe(
        Effect.orDie,
        Effect.flatMap(Option.match({ onNone: () => Effect.fail(new ProjectNotFound({ id })), onSome: Effect.succeed })),
        Effect.map((row) => new Project(row)),
      )

    return {
      create: (input) =>
        repo.create(input).pipe(
          Effect.map((row) => new Project(row)),
          Effect.tap((project) =>
            Effect.logInfo('Project created').pipe(Effect.annotateLogs({ id: project.id, name: project.name })),
          ),
          Effect.catchTag('EffectDrizzleQueryError', (error) =>
            sqlReasonTag(error) === 'UniqueViolation'
              ? Effect.fail(new ProjectNameConflict({ name: input.name }))
              : Effect.die(error),
          ),
        ),

      findAll: () => Effect.orDie(Effect.map(repo.findAll(), (rows) => rows.map((row) => new Project(row)))),

      findOne,

      update: (id, input) =>
        findOne(id).pipe(
          Effect.andThen(() => repo.update(id, input)),
          Effect.flatMap(Option.match({ onNone: () => Effect.fail(new ProjectNotFound({ id })), onSome: Effect.succeed })),
          Effect.map((row) => new Project(row)),
          Effect.tap(() => Effect.logInfo('Project updated').pipe(Effect.annotateLogs({ id }))),
          Effect.catchTag('EffectDrizzleQueryError', (error) =>
            sqlReasonTag(error) === 'UniqueViolation'
              ? Effect.fail(new ProjectNameConflict({ name: input.name ?? '' }))
              : Effect.die(error),
          ),
        ),

      remove: (id) =>
        findOne(id).pipe(
          Effect.andThen(() => repo.delete(id)),
          Effect.tap(() => Effect.logInfo('Project deleted').pipe(Effect.annotateLogs({ id }))),
          Effect.catchTag('EffectDrizzleQueryError', (error) =>
            sqlReasonTag(error) === 'ConstraintError' ? Effect.fail(new ProjectHasTests({ id })) : Effect.die(error),
          ),
        ),
    }
  }),
)
