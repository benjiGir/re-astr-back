import { describe, expect, layer } from '@effect/vitest'
import { Effect } from 'effect'
import { AppTestLayer } from '@/test/AppTestLayer.js'
import { createAuthenticatedUser } from '@/test/AuthFixture.js'
import { createProjectAndCategory } from '@/test/DataFixture.js'
import { deleteJson, getJson, patchJson, postJson } from '@/test/HttpTestClient.js'

let counter = 0
const unique = (label: string) => `${label}-${Date.now()}-${counter++}`

describe('Users', () => {
  layer(AppTestLayer)((it) => {
    it.effect('findAll and findById are readable by any authenticated user', () =>
      Effect.gen(function* () {
        const viewer = yield* createAuthenticatedUser('user')
        expect((yield* getJson('/users', viewer.cookieHeader)).status).toBe(200)
        expect((yield* getJson(`/users/${viewer.userId}`, viewer.cookieHeader)).status).toBe(200)
      }),
    )

    it.effect('findById returns 404 for a missing user', () =>
      Effect.gen(function* () {
        const viewer = yield* createAuthenticatedUser('user')
        const response = yield* getJson(
          '/users/00000000-0000-0000-0000-000000000000',
          viewer.cookieHeader,
        )
        expect(response.status).toBe(404)
      }),
    )

    it.effect("a user can update their own profile but not someone else's", () =>
      Effect.gen(function* () {
        const self = yield* createAuthenticatedUser('user')
        const other = yield* createAuthenticatedUser('user')

        const ownUpdate = yield* patchJson(
          `/users/${self.userId}`,
          { name: 'Renamed' },
          self.cookieHeader,
        )
        expect(ownUpdate.status).toBe(200)

        const forbidden = yield* patchJson(
          `/users/${other.userId}`,
          { name: 'Renamed' },
          self.cookieHeader,
        )
        expect(forbidden.status).toBe(403)
      }),
    )

    it.effect('a master can update any profile', () =>
      Effect.gen(function* () {
        const master = yield* createAuthenticatedUser('master')
        const other = yield* createAuthenticatedUser('user')

        const updated = yield* patchJson(
          `/users/${other.userId}`,
          { name: 'Renamed By Master' },
          master.cookieHeader,
        )
        expect(updated.status).toBe(200)
      }),
    )

    it.effect('update rejects changing email to one already taken', () =>
      Effect.gen(function* () {
        const self = yield* createAuthenticatedUser('user')
        const other = yield* createAuthenticatedUser('user')

        const conflict = yield* patchJson(
          `/users/${self.userId}`,
          { email: other.email },
          self.cookieHeader,
        )
        expect(conflict.status).toBe(409)
      }),
    )

    it.effect('only a master can assign a role', () =>
      Effect.gen(function* () {
        const archivist = yield* createAuthenticatedUser('archivist')
        const target = yield* createAuthenticatedUser('user')

        const forbidden = yield* patchJson(
          `/users/${target.userId}/role`,
          { role: 'contributor' },
          archivist.cookieHeader,
        )
        expect(forbidden.status).toBe(403)

        const master = yield* createAuthenticatedUser('master')
        const assigned = yield* patchJson(
          `/users/${target.userId}/role`,
          { role: 'contributor' },
          master.cookieHeader,
        )
        expect(assigned.status).toBe(200)
        const body = (yield* assigned.json) as { role: string }
        expect(body.role).toBe('contributor')
      }),
    )

    it.effect('only a master can remove a user', () =>
      Effect.gen(function* () {
        const archivist = yield* createAuthenticatedUser('archivist')
        const target = yield* createAuthenticatedUser('user')

        const forbidden = yield* deleteJson(`/users/${target.userId}`, archivist.cookieHeader)
        expect(forbidden.status).toBe(403)

        const master = yield* createAuthenticatedUser('master')
        const removed = yield* deleteJson(`/users/${target.userId}`, master.cookieHeader)
        expect(removed.status).toBe(204)
      }),
    )

    it.effect('remove is blocked while the user has authored a test', () =>
      Effect.gen(function* () {
        const author = yield* createAuthenticatedUser('contributor')
        const { projectId, categoryId } = yield* createProjectAndCategory
        yield* postJson(
          '/tests',
          { projectId, categoryId, name: unique('Test'), commonData: {} },
          author.cookieHeader,
        )

        const master = yield* createAuthenticatedUser('master')
        const blocked = yield* deleteJson(`/users/${author.userId}`, master.cookieHeader)
        expect(blocked.status).toBe(409)
      }),
    )
  })
})
