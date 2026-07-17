import { eq } from 'drizzle-orm'
import type { EffectDrizzleQueryError } from 'drizzle-orm/effect-core'
import { Context, Effect, Layer, Option } from 'effect'
import type { Project as ProjectRow } from '@/domain/schema/projects.schema.js'
import { projects } from '@/domain/schema/projects.schema.js'
import { Database } from '@/infra/Database.js'
import type { CreateProject, UpdateProject } from '@/modules/projects/Project.js'

export class ProjectsRepo extends Context.Service<
  ProjectsRepo,
  {
    readonly create: (input: CreateProject) => Effect.Effect<ProjectRow, EffectDrizzleQueryError>
    readonly findAll: () => Effect.Effect<ProjectRow[], EffectDrizzleQueryError>
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<ProjectRow>, EffectDrizzleQueryError>
    readonly update: (
      id: string,
      input: UpdateProject,
    ) => Effect.Effect<Option.Option<ProjectRow>, EffectDrizzleQueryError>
    readonly delete: (id: string) => Effect.Effect<void, EffectDrizzleQueryError>
  }
>()('ProjectsRepo') {}

export const ProjectsRepoLive = Layer.effect(
  ProjectsRepo,
  Effect.gen(function* () {
    const db = yield* Database

    const create = Effect.fn('ProjectsRepo.create')(function* (input: CreateProject) {
      return yield* Effect.map(
        db
          .insert(projects)
          .values({ name: input.name, description: input.description ?? null })
          .returning(),
        ([row]) => row,
      )
    })

    const findAll = Effect.fn('ProjectsRepo.findAll')(function* () {
      return yield* db.select().from(projects)
    })

    const findById = Effect.fn('ProjectsRepo.findById')(function* (id: string) {
      return yield* Effect.map(
        db.select().from(projects).where(eq(projects.id, id)).limit(1),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const update = Effect.fn('ProjectsRepo.update')(function* (id: string, input: UpdateProject) {
      return yield* Effect.map(
        db
          .update(projects)
          .set({
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
          })
          .where(eq(projects.id, id))
          .returning(),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    const deleteProject = Effect.fn('ProjectsRepo.delete')(function* (id: string) {
      return yield* Effect.asVoid(db.delete(projects).where(eq(projects.id, id)))
    })

    return { create, findAll, findById, update, delete: deleteProject }
  }),
)
