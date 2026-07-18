import { describe, expect, layer } from '@effect/vitest'
import { Effect } from 'effect'
import { AppTestLayer } from '@/test/AppTestLayer.js'
import { createAuthenticatedUser } from '@/test/AuthFixture.js'
import { createProjectAndCategory } from '@/test/DataFixture.js'
import { deleteJson, getJson, patchJson, postJson } from '@/test/HttpTestClient.js'

let counter = 0
const unique = (label: string) => `${label}-${Date.now()}-${counter++}`

describe('Tests', () => {
  layer(AppTestLayer)((it) => {
    it.effect('a contributor can create a test; a plain user cannot', () =>
      Effect.gen(function* () {
        const { projectId, categoryId } = yield* createProjectAndCategory()
        const contributor = yield* createAuthenticatedUser('contributor')

        const created = yield* postJson(
          '/tests',
          { projectId, categoryId, name: unique('Test'), commonData: {} },
          contributor.cookieHeader,
        )
        expect(created.status).toBe(201)
        const body = (yield* created.json) as { createdBy: string }
        expect(body.createdBy).toBe(contributor.userId)

        const user = yield* createAuthenticatedUser('user')
        const forbidden = yield* postJson(
          '/tests',
          { projectId, categoryId, name: unique('Test'), commonData: {} },
          user.cookieHeader,
        )
        expect(forbidden.status).toBe(403)
      }),
    )

    it.effect('findAll filters by categoryId and findById 404s for a missing test', () =>
      Effect.gen(function* () {
        const { projectId, categoryId } = yield* createProjectAndCategory()
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/tests',
          { projectId, categoryId, name: unique('Test'), commonData: {} },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const filtered = yield* getJson(`/tests?categoryId=${categoryId}`, contributor.cookieHeader)
        expect(filtered.status).toBe(200)
        const filteredBody = (yield* filtered.json) as { id: string }[]
        expect(filteredBody.some((t) => t.id === id)).toBe(true)

        const missing = yield* getJson(
          '/tests/00000000-0000-0000-0000-000000000000',
          contributor.cookieHeader,
        )
        expect(missing.status).toBe(404)
      }),
    )

    it.effect('a contributor can update a test; a plain user cannot', () =>
      Effect.gen(function* () {
        const { projectId, categoryId } = yield* createProjectAndCategory()
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/tests',
          { projectId, categoryId, name: unique('Test'), commonData: {} },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const user = yield* createAuthenticatedUser('user')
        const forbidden = yield* patchJson(
          `/tests/${id}`,
          { status: 'completed' },
          user.cookieHeader,
        )
        expect(forbidden.status).toBe(403)

        const updated = yield* patchJson(
          `/tests/${id}`,
          { status: 'completed' },
          contributor.cookieHeader,
        )
        expect(updated.status).toBe(200)
      }),
    )

    it.effect('an archivist can delete a test; a contributor cannot', () =>
      Effect.gen(function* () {
        const { projectId, categoryId } = yield* createProjectAndCategory()
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/tests',
          { projectId, categoryId, name: unique('Test'), commonData: {} },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const forbidden = yield* deleteJson(`/tests/${id}`, contributor.cookieHeader)
        expect(forbidden.status).toBe(403)

        const archivist = yield* createAuthenticatedUser('archivist')
        const removed = yield* deleteJson(`/tests/${id}`, archivist.cookieHeader)
        expect(removed.status).toBe(204)
      }),
    )
  })
})
