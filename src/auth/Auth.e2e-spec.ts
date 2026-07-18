import { describe, expect, layer } from '@effect/vitest'
import { Effect } from 'effect'
import { Cookies } from 'effect/unstable/http'
import { AppTestLayer } from '@/test/AppTestLayer.js'
import { getJson, postJson } from '@/test/HttpTestClient.js'

let counter = 0
const uniqueEmail = () => `auth-e2e-${Date.now()}-${counter++}@example.com`

describe('Auth', () => {
  layer(AppTestLayer)((it) => {
    it.effect('sign-up creates a user and returns a session cookie', () =>
      Effect.gen(function* () {
        const email = uniqueEmail()
        const response = yield* postJson('/auth/sign-up/email', {
          email,
          password: 'correct-horse',
          name: 'Ada',
        })

        expect(response.status).toBe(201)
        expect(Cookies.isEmpty(response.cookies)).toBe(false)

        const body = yield* response.json
        expect(body).toMatchObject({ user: { email, name: 'Ada' } })
      }),
    )

    it.effect('sign-up rejects a duplicate email', () =>
      Effect.gen(function* () {
        const email = uniqueEmail()
        const payload = { email, password: 'correct-horse' }

        expect((yield* postJson('/auth/sign-up/email', payload)).status).toBe(201)
        expect((yield* postJson('/auth/sign-up/email', payload)).status).toBe(409)
      }),
    )

    it.effect('sign-in with the wrong password is rejected', () =>
      Effect.gen(function* () {
        const email = uniqueEmail()
        yield* postJson('/auth/sign-up/email', { email, password: 'correct-horse' })

        const response = yield* postJson('/auth/sign-in/email', {
          email,
          password: 'wrong-password',
        })
        expect(response.status).toBe(401)
      }),
    )

    it.effect('sign-in, get-session and sign-out round-trip through the session cookie', () =>
      Effect.gen(function* () {
        const email = uniqueEmail()
        yield* postJson('/auth/sign-up/email', { email, password: 'correct-horse' })

        const signInResponse = yield* postJson('/auth/sign-in/email', {
          email,
          password: 'correct-horse',
        })
        expect(signInResponse.status).toBe(200)
        const cookieHeader = Cookies.toCookieHeader(signInResponse.cookies)

        const sessionResponse = yield* getJson('/auth/get-session', cookieHeader)
        expect(sessionResponse.status).toBe(200)
        const sessionBody = yield* sessionResponse.json
        expect(sessionBody).toMatchObject({ user: { email } })

        const signOutResponse = yield* postJson('/auth/sign-out', {}, cookieHeader)
        expect(signOutResponse.status).toBe(200)

        const afterSignOut = yield* getJson('/auth/get-session', cookieHeader)
        expect(afterSignOut.status).toBe(401)
      }),
    )

    it.effect('get-session without a cookie is unauthorized', () =>
      Effect.gen(function* () {
        const response = yield* getJson('/auth/get-session')
        expect(response.status).toBe(401)
      }),
    )

    it.effect('forgot-password always returns success, even for an unknown email', () =>
      Effect.gen(function* () {
        const response = yield* postJson('/auth/forgot-password', {
          email: 'nobody-e2e@example.com',
        })
        expect(response.status).toBe(200)
      }),
    )
  })
})
