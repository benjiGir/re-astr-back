import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import type { Project as ProjectRow } from '@/domain/schema/projects.schema.js'
import { CreateProject, ProjectNotFound } from '@/modules/projects/Project.js'
import { ProjectsRepo } from '@/modules/projects/ProjectsRepo.js'
import { ProjectsService, ProjectsServiceLive } from '@/modules/projects/ProjectsService.js'

const now = new Date('2026-01-01T00:00:00.000Z')

const mockRow: ProjectRow = {
  id: 'project-1',
  name: 'Avionics System Validation',
  description: null,
  createdAt: now,
  updatedAt: now,
}

const makeMockRepo = (overrides: Partial<typeof ProjectsRepo.Service> = {}) => ({
  create: vi.fn(() => Effect.succeed(mockRow)),
  findAll: vi.fn(() => Effect.succeed([mockRow])),
  findById: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  update: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  delete: vi.fn(() => Effect.void),
  ...overrides,
})

const runWithRepo = <A, E>(repo: typeof ProjectsRepo.Service, effect: Effect.Effect<A, E, ProjectsService>) =>
  Effect.provide(effect, ProjectsServiceLive.pipe(Layer.provide(Layer.succeed(ProjectsRepo, repo))))

describe('ProjectsService', () => {
  it.effect('create returns the created project', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* ProjectsService
        const project = yield* service.create(new CreateProject({ name: 'Avionics System Validation' }))

        expect(project.id).toBe('project-1')
        expect(project.name).toBe('Avionics System Validation')
      }),
    ),
  )

  it.effect('findOne fails with ProjectNotFound when the repo returns none', () =>
    runWithRepo(
      makeMockRepo({ findById: vi.fn(() => Effect.succeed(Option.none())) }),
      Effect.gen(function* () {
        const service = yield* ProjectsService
        const error = yield* Effect.flip(service.findOne('missing-id'))

        expect(error).toBeInstanceOf(ProjectNotFound)
        expect(error.id).toBe('missing-id')
      }),
    ),
  )

  it.effect('findOne returns the project when the repo finds a row', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* ProjectsService
        const project = yield* service.findOne('project-1')

        expect(project.id).toBe('project-1')
      }),
    ),
  )

  it.effect('remove fails with ProjectNotFound and never calls repo.delete', () => {
    const deleteFn = vi.fn(() => Effect.void)

    return runWithRepo(
      makeMockRepo({ findById: vi.fn(() => Effect.succeed(Option.none())), delete: deleteFn }),
      Effect.gen(function* () {
        const service = yield* ProjectsService
        const error = yield* Effect.flip(service.remove('missing-id'))

        expect(error).toBeInstanceOf(ProjectNotFound)
        expect(deleteFn).not.toHaveBeenCalled()
      }),
    )
  })

  it.effect('remove succeeds when the project exists', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* ProjectsService
        yield* service.remove('project-1')
      }),
    ),
  )
})
