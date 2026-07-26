import { beforeEach, describe, expect, layer } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { CreateProject, UpdateProject } from '@/modules/projects/Project.js'
import { ProjectsRepo, ProjectsRepoLive } from '@/modules/projects/ProjectsRepo.js'
import { DatabaseTestLive, truncateAll } from '@/test/DbTestLayer.js'

const MISSING_ID = '00000000-0000-0000-0000-000000000000'

describe('ProjectsRepo', () => {
  layer(ProjectsRepoLive.pipe(Layer.provide(DatabaseTestLive)))((it) => {
    beforeEach(() => truncateAll())

    it.effect('create inserts and returns the row', () =>
      Effect.gen(function* () {
        const repo = yield* ProjectsRepo
        const project = yield* repo.create(new CreateProject({ name: 'Avionics' }))
        expect(project.name).toBe('Avionics')
        expect(project.description).toBeNull()
      }),
    )

    it.effect('findAll returns every created row', () =>
      Effect.gen(function* () {
        const repo = yield* ProjectsRepo
        yield* repo.create(new CreateProject({ name: 'A' }))
        yield* repo.create(new CreateProject({ name: 'B' }))
        const all = yield* repo.findAll
        expect(all.map((p) => p.name).sort()).toEqual(['A', 'B'])
      }),
    )

    it.effect('findById finds an existing row and returns None for a missing one', () =>
      Effect.gen(function* () {
        const repo = yield* ProjectsRepo
        const created = yield* repo.create(new CreateProject({ name: 'A' }))

        const found = yield* repo.findById(created.id)
        expect(Option.isSome(found) ? found.value.id : undefined).toBe(created.id)

        const missing = yield* repo.findById(MISSING_ID)
        expect(Option.isNone(missing)).toBe(true)
      }),
    )

    it.effect('update patches only the provided fields', () =>
      Effect.gen(function* () {
        const repo = yield* ProjectsRepo
        const created = yield* repo.create(new CreateProject({ name: 'A', description: 'orig' }))

        const updated = yield* repo.update(created.id, new UpdateProject({ name: 'B' }))
        expect(Option.isSome(updated) ? updated.value.name : undefined).toBe('B')
        expect(Option.isSome(updated) ? updated.value.description : undefined).toBe('orig')
      }),
    )

    it.effect('update returns None for a missing row', () =>
      Effect.gen(function* () {
        const repo = yield* ProjectsRepo
        const updated = yield* repo.update(MISSING_ID, new UpdateProject({ name: 'B' }))
        expect(Option.isNone(updated)).toBe(true)
      }),
    )

    it.effect('delete removes the row', () =>
      Effect.gen(function* () {
        const repo = yield* ProjectsRepo
        const created = yield* repo.create(new CreateProject({ name: 'A' }))
        yield* repo.delete(created.id)
        const found = yield* repo.findById(created.id)
        expect(Option.isNone(found)).toBe(true)
      }),
    )
  })
})
