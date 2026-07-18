import { describe, expect, layer } from '@effect/vitest'
import { Effect } from 'effect'
import { AppTestLayer } from '@/test/AppTestLayer.js'
import { createAuthenticatedUser } from '@/test/AuthFixture.js'
import { createProjectAndCategory } from '@/test/DataFixture.js'
import { deleteJson, getJson, patchJson, postJson } from '@/test/HttpTestClient.js'

let counter = 0
const unique = (label: string) => `${label}-${Date.now()}-${counter++}`
const emptyBaseSchema = { fields: [] }

describe('Categories', () => {
  layer(AppTestLayer)((it) => {
    it.effect('a contributor can create a category; a plain user cannot', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/categories',
          { name: unique('Category'), baseSchema: emptyBaseSchema },
          contributor.cookieHeader,
        )
        expect(created.status).toBe(201)

        const user = yield* createAuthenticatedUser('user')
        const forbidden = yield* postJson(
          '/categories',
          { name: unique('Category'), baseSchema: emptyBaseSchema },
          user.cookieHeader,
        )
        expect(forbidden.status).toBe(403)
      }),
    )

    it.effect('findAll and findById are readable by any authenticated user', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/categories',
          { name: unique('Category'), baseSchema: emptyBaseSchema },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const viewer = yield* createAuthenticatedUser('user')
        expect((yield* getJson('/categories', viewer.cookieHeader)).status).toBe(200)
        expect((yield* getJson(`/categories/${id}`, viewer.cookieHeader)).status).toBe(200)
      }),
    )

    it.effect('findById returns 404 for a missing category', () =>
      Effect.gen(function* () {
        const viewer = yield* createAuthenticatedUser('user')
        const response = yield* getJson(
          '/categories/00000000-0000-0000-0000-000000000000',
          viewer.cookieHeader,
        )
        expect(response.status).toBe(404)
      }),
    )

    it.effect('an archivist can update a category; a contributor cannot', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/categories',
          { name: unique('Category'), baseSchema: emptyBaseSchema },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const forbidden = yield* patchJson(
          `/categories/${id}`,
          { name: unique('Renamed') },
          contributor.cookieHeader,
        )
        expect(forbidden.status).toBe(403)

        const archivist = yield* createAuthenticatedUser('archivist')
        const updated = yield* patchJson(
          `/categories/${id}`,
          { name: unique('Renamed') },
          archivist.cookieHeader,
        )
        expect(updated.status).toBe(200)
      }),
    )

    it.effect('an archivist can delete a category; a contributor cannot', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/categories',
          { name: unique('Category'), baseSchema: emptyBaseSchema },
          contributor.cookieHeader,
        )
        const { id } = (yield* created.json) as { id: string }

        const forbidden = yield* deleteJson(`/categories/${id}`, contributor.cookieHeader)
        expect(forbidden.status).toBe(403)

        const archivist = yield* createAuthenticatedUser('archivist')
        const removed = yield* deleteJson(`/categories/${id}`, archivist.cookieHeader)
        expect(removed.status).toBe(204)

        const missing = yield* getJson(`/categories/${id}`, archivist.cookieHeader)
        expect(missing.status).toBe(404)
      }),
    )

    it.effect('remove is blocked while a test still references the category', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson(
          '/categories',
          { name: unique('Category'), baseSchema: emptyBaseSchema },
          contributor.cookieHeader,
        )
        const { id: categoryId } = (yield* created.json) as { id: string }
        const { projectId } = yield* createProjectAndCategory()

        yield* postJson(
          '/tests',
          { projectId, categoryId, name: unique('Test'), commonData: {} },
          contributor.cookieHeader,
        )

        const archivist = yield* createAuthenticatedUser('archivist')
        const blocked = yield* deleteJson(`/categories/${categoryId}`, archivist.cookieHeader)
        expect(blocked.status).toBe(409)
      }),
    )
  })
})
