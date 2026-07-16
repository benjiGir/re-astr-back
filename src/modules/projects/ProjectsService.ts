import { Context, Effect, Layer, Option } from 'effect'
import { sqlReasonTag } from '@/infra/Database.js'
import {
  CreateProject,
  Project,
  ProjectHasTests,
  ProjectNameConflict,
  ProjectNotFound,
  type UpdateProject,
} from '@/modules/projects/Project.js'
import { ProjectsRepo } from '@/modules/projects/ProjectsRepo.js'

export class ProjectsService extends Context.Service<
  ProjectsService,
  {
    readonly create: (input: CreateProject) => Effect.Effect<Project, ProjectNameConflict>
    readonly findAll: () => Effect.Effect<Project[]>
    readonly findOne: (id: string) => Effect.Effect<Project, ProjectNotFound>
    readonly update: (
      id: string,
      input: UpdateProject,
    ) => Effect.Effect<Project, ProjectNotFound | ProjectNameConflict>
    readonly remove: (id: string) => Effect.Effect<void, ProjectNotFound | ProjectHasTests>
  }
>()('ProjectsService') {}

export const ProjectsServiceLive = Layer.effect(
  ProjectsService,
  Effect.gen(function* () {
    const repo = yield* ProjectsRepo

    const findOne = Effect.fn('ProjectsService.findOne')(function* (id: string) {
      return yield* repo.findById(id).pipe(
        Effect.orDie,
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new ProjectNotFound({ id })),
            onSome: Effect.succeed,
          }),
        ),
        Effect.map((row) => new Project(row)),
      )
    })

    const create = Effect.fn('ProjectsService.create')(function* (input: CreateProject) {
      return yield* repo.create(input).pipe(
        Effect.map((row) => new Project(row)),
        Effect.tap((project) =>
          Effect.logInfo('Project created').pipe(Effect.annotateLogs({ id: project.id, name: project.name })),
        ),
        Effect.catchTag('EffectDrizzleQueryError', (error) =>
          sqlReasonTag(error) === 'UniqueViolation'
            ? Effect.fail(new ProjectNameConflict({ name: input.name }))
            : Effect.die(error),
        ),
      )
    })

    const findAll = Effect.fn('ProjectsService.findAll')(function* () {
      return yield* Effect.orDie(Effect.map(repo.findAll(), (rows) => rows.map((row) => new Project(row))))
    })

    const update = Effect.fn('ProjectsService.update')(function* (id: string, input: UpdateProject) {
      return yield* findOne(id).pipe(
        Effect.andThen(() => repo.update(id, input)),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new ProjectNotFound({ id })),
            onSome: Effect.succeed,
          }),
        ),
        Effect.map((row) => new Project(row)),
        Effect.tap(() => Effect.logInfo('Project updated').pipe(Effect.annotateLogs({ id }))),
        Effect.catchTag('EffectDrizzleQueryError', (error) =>
          sqlReasonTag(error) === 'UniqueViolation'
            ? Effect.fail(new ProjectNameConflict({ name: input.name ?? '' }))
            : Effect.die(error),
        ),
      )
    })

    const remove = Effect.fn('ProjectsService.remove')(function* (id: string) {
      return yield* findOne(id).pipe(
        Effect.andThen(() => repo.delete(id)),
        Effect.tap(() => Effect.logInfo('Project deleted').pipe(Effect.annotateLogs({ id }))),
        Effect.catchTag('EffectDrizzleQueryError', (error) =>
          sqlReasonTag(error) === 'ConstraintError' ? Effect.fail(new ProjectHasTests({ id })) : Effect.die(error),
        ),
      )
    })

    return { create, findAll, findOne, update, remove }
  }),
)
