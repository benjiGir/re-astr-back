import { describe, expect, layer } from '@effect/vitest'
import { Effect } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { AppTestLayer } from '@/test/AppTestLayer.js'
import { createAuthenticatedUser } from '@/test/AuthFixture.js'
import { createTest } from '@/test/DataFixture.js'
import { deleteJson, getJson, patchJson } from '@/test/HttpTestClient.js'

const upload = (testId: string, cookieHeader: string) => {
  const form = new FormData()
  form.append('testId', testId)
  form.append('fileType', 'report')
  form.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'report.txt')
  const request = HttpClientRequest.post('/test-files/upload').pipe(
    HttpClientRequest.bodyFormData(form),
    HttpClientRequest.setHeader('Cookie', cookieHeader),
  )
  return HttpClient.execute(request)
}

describe('TestFiles', () => {
  layer(AppTestLayer)((it) => {
    it.effect('a contributor can upload a file; a plain user cannot', () =>
      Effect.gen(function* () {
        const { testId } = yield* createTest()
        const contributor = yield* createAuthenticatedUser('contributor')

        const created = yield* upload(testId, contributor.cookieHeader)
        expect(created.status).toBe(201)
        const body = (yield* created.json) as { uploadedBy: string; originalFilename: string }
        expect(body.uploadedBy).toBe(contributor.userId)
        expect(body.originalFilename).toBe('report.txt')

        const user = yield* createAuthenticatedUser('user')
        const forbidden = yield* upload(testId, user.cookieHeader)
        expect(forbidden.status).toBe(403)
      }),
    )

    it.effect('findAll filters by testId and findById 404s for a missing file', () =>
      Effect.gen(function* () {
        const { testId } = yield* createTest()
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* upload(testId, contributor.cookieHeader)
        const { id } = (yield* created.json) as { id: string }

        const filtered = yield* getJson(`/test-files?testId=${testId}`, contributor.cookieHeader)
        expect(filtered.status).toBe(200)
        const filteredBody = (yield* filtered.json) as { id: string }[]
        expect(filteredBody.some((f) => f.id === id)).toBe(true)

        const missing = yield* getJson(
          '/test-files/00000000-0000-0000-0000-000000000000',
          contributor.cookieHeader,
        )
        expect(missing.status).toBe(404)
      }),
    )

    it.effect('download streams the uploaded bytes back', () =>
      Effect.gen(function* () {
        const { testId } = yield* createTest()
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* upload(testId, contributor.cookieHeader)
        const { id } = (yield* created.json) as { id: string }

        const response = yield* getJson(`/test-files/${id}/download`, contributor.cookieHeader)
        expect(response.status).toBe(200)
        const text = yield* response.text
        expect(text).toBe('hello world')
      }),
    )

    it.effect('presignedUrl returns a URL for the stored object', () =>
      Effect.gen(function* () {
        const { testId } = yield* createTest()
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* upload(testId, contributor.cookieHeader)
        const { id } = (yield* created.json) as { id: string }

        const response = yield* getJson(`/test-files/${id}/presigned-url`, contributor.cookieHeader)
        expect(response.status).toBe(200)
        const body = (yield* response.json) as { url: string }
        expect(body.url).toMatch(/^https?:\/\//)
      }),
    )

    it.effect('a contributor can update a file; a plain user cannot', () =>
      Effect.gen(function* () {
        const { testId } = yield* createTest()
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* upload(testId, contributor.cookieHeader)
        const { id } = (yield* created.json) as { id: string }

        const user = yield* createAuthenticatedUser('user')
        const forbidden = yield* patchJson(
          `/test-files/${id}`,
          { fileType: 'documentation' },
          user.cookieHeader,
        )
        expect(forbidden.status).toBe(403)

        const updated = yield* patchJson(
          `/test-files/${id}`,
          { fileType: 'documentation' },
          contributor.cookieHeader,
        )
        expect(updated.status).toBe(200)
      }),
    )

    it.effect('an archivist can delete a file; a contributor cannot', () =>
      Effect.gen(function* () {
        const { testId } = yield* createTest()
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* upload(testId, contributor.cookieHeader)
        const { id } = (yield* created.json) as { id: string }

        const forbidden = yield* deleteJson(`/test-files/${id}`, contributor.cookieHeader)
        expect(forbidden.status).toBe(403)

        const archivist = yield* createAuthenticatedUser('archivist')
        const removed = yield* deleteJson(`/test-files/${id}`, archivist.cookieHeader)
        expect(removed.status).toBe(204)
      }),
    )
  })
})
