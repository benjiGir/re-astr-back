import { Effect, Schema } from 'effect'
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiError, HttpApiGroup } from 'effect/unstable/httpapi'
import { Authorization } from '@/auth/Authorization.js'
import { requireRole } from '@/auth/Role.js'
import { CreateProject, Project, ProjectHasTests, ProjectNameConflict, ProjectNotFound, UpdateProject } from '@/modules/projects/Project.js'
import { ProjectsService } from '@/modules/projects/ProjectsService.js'

export const ProjectsGroup = HttpApiGroup.make('projects')
  .add(
    HttpApiEndpoint.post('create', '/projects', {
      payload: CreateProject,
      success: Project,
      error: [ProjectNameConflict, HttpApiError.Forbidden],
    }),
  )
  .add(HttpApiEndpoint.get('findAll', '/projects', { success: Schema.Array(Project) }))
  .add(HttpApiEndpoint.get('findOne', '/projects/:id', { params: { id: Schema.String }, success: Project, error: ProjectNotFound }))
  .add(
    HttpApiEndpoint.patch('update', '/projects/:id', {
      params: { id: Schema.String },
      payload: UpdateProject,
      success: Project,
      error: [ProjectNotFound, ProjectNameConflict, HttpApiError.Forbidden],
    }),
  )
  .add(
    HttpApiEndpoint.delete('remove', '/projects/:id', {
      params: { id: Schema.String },
      error: [ProjectNotFound, ProjectHasTests, HttpApiError.Forbidden],
    }),
  )
  .middleware(Authorization)

// Same "re-astr" id as the real Api (src/Api.ts) — a self-contained mini Api
// gives HttpApiBuilder.group proper type inference here without importing
// the real Api (which itself needs to import ProjectsGroup to assemble —
// that would be circular).
class ProjectsApi extends HttpApi.make('re-astr').add(ProjectsGroup) {}

export const ProjectsGroupLive = HttpApiBuilder.group(ProjectsApi, 'projects', (handlers) =>
  Effect.gen(function* () {
    const service = yield* ProjectsService

    return handlers
      .handle('create', ({ payload }) =>
        requireRole('contributor').pipe(Effect.andThen(() => service.create(payload))),
      )
      .handle('findAll', () => service.findAll())
      .handle('findOne', ({ params }) => service.findOne(params.id))
      .handle('update', ({ params, payload }) =>
        requireRole('archivist').pipe(Effect.andThen(() => service.update(params.id, payload))),
      )
      .handle('remove', ({ params }) =>
        requireRole('archivist').pipe(Effect.andThen(() => service.remove(params.id))),
      )
  }),
)
