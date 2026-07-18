import { describe, expect, layer } from '@effect/vitest'
import { Effect } from 'effect'
import { AppTestLayer } from '@/test/AppTestLayer.js'
import { createAuthenticatedUser } from '@/test/AuthFixture.js'
import { createProjectAndCategory } from '@/test/DataFixture.js'
import { deleteJson, getJson, patchJson, postJson } from '@/test/HttpTestClient.js'

let counter = 0
const unique = (label: string) => `${label}-${Date.now()}-${counter++}`

describe('Projects', () => {
  layer(AppTestLayer)((it) => {
    it.effect('a contributor can create a project; a plain user cannot', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/projects',
          { name: unique('Project') },
          contributor.cookieHeader,
        )
        expect(created.status).toBe(201)

        const user = yield* createAuthenticatedUser('user')
        const forbidden = yield* postJson(
          '/projects',
          { name: unique('Project') },
          user.cookieHeader,
        )
        expect(forbidden.status).toBe(403)
      }),
    )

    it.effect('create rejects a duplicate name', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const name = unique('Project')

        expect((yield* postJson('/projects', { name }, contributor.cookieHeader)).status).toBe(201)
        expect((yield* postJson('/projects', { name }, contributor.cookieHeader)).status).toBe(409)
      }),
    )

    it.effect('findAll and findById are readable by any authenticated user', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/projects',
          { name: unique('Project') },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const viewer = yield* createAuthenticatedUser('user')

        const all = yield* getJson('/projects', viewer.cookieHeader)
        expect(all.status).toBe(200)

        const one = yield* getJson(`/projects/${id}`, viewer.cookieHeader)
        expect(one.status).toBe(200)
      }),
    )

    it.effect('findById returns 404 for a missing project', () =>
      Effect.gen(function* () {
        const viewer = yield* createAuthenticatedUser('user')
        const response = yield* getJson(
          '/projects/00000000-0000-0000-0000-000000000000',
          viewer.cookieHeader,
        )
        expect(response.status).toBe(404)
      }),
    )

    it.effect('an archivist can update a project; a contributor cannot', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/projects',
          { name: unique('Project') },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const forbidden = yield* patchJson(
          `/projects/${id}`,
          { name: unique('Renamed') },
          contributor.cookieHeader,
        )
        expect(forbidden.status).toBe(403)

        const archivist = yield* createAuthenticatedUser('archivist')
        const updated = yield* patchJson(
          `/projects/${id}`,
          { name: unique('Renamed') },
          archivist.cookieHeader,
        )
        expect(updated.status).toBe(200)
      }),
    )

    it.effect('update rejects renaming to a name already taken by another project', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const takenName = unique('Project')
        yield* postJson('/projects', { name: takenName }, contributor.cookieHeader)

        const created = yield* postJson(
          '/projects',
          { name: unique('Project') },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const archivist = yield* createAuthenticatedUser('archivist')
        const conflict = yield* patchJson(
          `/projects/${id}`,
          { name: takenName },
          archivist.cookieHeader,
        )
        expect(conflict.status).toBe(409)
      }),
    )

    it.effect('remove is blocked while a test still references the project', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/projects',
          { name: unique('Project') },
          contributor.cookieHeader,
        )
        const { id: projectId } = (yield* created.json) as { id: string }
        const { categoryId } = yield* createProjectAndCategory()

        yield* postJson(
          '/tests',
          { projectId, categoryId, name: unique('Test'), commonData: {} },
          contributor.cookieHeader,
        )

        const archivist = yield* createAuthenticatedUser('archivist')
        const blocked = yield* deleteJson(`/projects/${projectId}`, archivist.cookieHeader)
        expect(blocked.status).toBe(409)
      }),
    )

    it.effect('an archivist can delete a project; a contributor cannot', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/projects',
          { name: unique('Project') },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const forbidden = yield* deleteJson(`/projects/${id}`, contributor.cookieHeader)
        expect(forbidden.status).toBe(403)

        const archivist = yield* createAuthenticatedUser('archivist')
        const removed = yield* deleteJson(`/projects/${id}`, archivist.cookieHeader)
        expect(removed.status).toBe(204)

        const missing = yield* getJson(`/projects/${id}`, archivist.cookieHeader)
        expect(missing.status).toBe(404)
      }),
    )
  })
})
