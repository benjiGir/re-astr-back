import { describe, expect, layer } from '@effect/vitest'
import { Effect } from 'effect'
import { HttpClient } from 'effect/unstable/http'
import { AppTestLayer } from '@/test/AppTestLayer.js'

describe('Health', () => {
  layer(AppTestLayer)((it) => {
    it.effect('GET /health returns healthy status', () =>
      Effect.gen(function* () {
        const response = yield* HttpClient.get('/health')
        expect(response.status).toBe(200)

        const body = yield* response.json
        expect(body).toMatchObject({ status: 'healthy' })
      }),
    )

    it.effect('GET /health/ready reports the database as up', () =>
      Effect.gen(function* () {
        const response = yield* HttpClient.get('/health/ready')
        expect(response.status).toBe(200)

        const body = yield* response.json
        expect(body).toMatchObject({ status: 'ready', services: { database: { status: 'up' } } })
      }),
    )
  })
})
