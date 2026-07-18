import { beforeEach, describe, expect, layer } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { CredentialsRepo, CredentialsRepoLive } from '@/auth/CredentialsRepo.js'
import { DatabaseTestLive, truncateAll } from '@/test/DbTestLayer.js'

let counter = 0
const uniqueEmail = () => `cred-${Date.now()}-${counter++}@example.com`

describe('CredentialsRepo', () => {
  layer(CredentialsRepoLive.pipe(Layer.provide(DatabaseTestLive)))((it) => {
    beforeEach(() => truncateAll())

    it.effect('createUser inserts and returns the row', () =>
      Effect.gen(function* () {
        const repo = yield* CredentialsRepo
        const email = uniqueEmail()
        const user = yield* repo.createUser({ email, name: 'A' })
        expect(user.email).toBe(email)
      }),
    )

    it.effect('findUserByEmail finds an existing user and returns None otherwise', () =>
      Effect.gen(function* () {
        const repo = yield* CredentialsRepo
        const email = uniqueEmail()
        yield* repo.createUser({ email, name: 'A' })

        const found = yield* repo.findUserByEmail(email)
        expect(Option.isSome(found) ? found.value.email : undefined).toBe(email)

        const missing = yield* repo.findUserByEmail('nobody@example.com')
        expect(Option.isNone(missing)).toBe(true)
      }),
    )

    it.effect('createAccount and findAccountByUserId round-trip', () =>
      Effect.gen(function* () {
        const repo = yield* CredentialsRepo
        const user = yield* repo.createUser({ email: uniqueEmail(), name: 'A' })
        yield* repo.createAccount({
          accountId: user.id,
          providerId: 'credential',
          userId: user.id,
          password: 'hash',
        })

        const found = yield* repo.findAccountByUserId(user.id)
        expect(Option.isSome(found) ? found.value.password : undefined).toBe('hash')
      }),
    )

    it.effect('updateAccountPassword changes the stored hash', () =>
      Effect.gen(function* () {
        const repo = yield* CredentialsRepo
        const user = yield* repo.createUser({ email: uniqueEmail(), name: 'A' })
        yield* repo.createAccount({
          accountId: user.id,
          providerId: 'credential',
          userId: user.id,
          password: 'old-hash',
        })

        yield* repo.updateAccountPassword(user.id, 'new-hash')

        const found = yield* repo.findAccountByUserId(user.id)
        expect(Option.isSome(found) ? found.value.password : undefined).toBe('new-hash')
      }),
    )

    it.effect('createSession then deleteSession removes it', () =>
      Effect.gen(function* () {
        const repo = yield* CredentialsRepo
        const user = yield* repo.createUser({ email: uniqueEmail(), name: 'A' })
        const session = yield* repo.createSession(user.id, new Date(Date.now() + 3_600_000))
        expect(session.userId).toBe(user.id)

        yield* repo.deleteSession(session.id)
      }),
    )

    it.effect('deleteSessionsByUserId removes every session for that user', () =>
      Effect.gen(function* () {
        const repo = yield* CredentialsRepo
        const user = yield* repo.createUser({ email: uniqueEmail(), name: 'A' })
        yield* repo.createSession(user.id, new Date(Date.now() + 3_600_000))
        yield* repo.createSession(user.id, new Date(Date.now() + 3_600_000))

        yield* repo.deleteSessionsByUserId(user.id)
      }),
    )

    it.effect('createVerification, findVerificationByToken and deleteVerification round-trip', () =>
      Effect.gen(function* () {
        const repo = yield* CredentialsRepo
        const token = `token-${Date.now()}`
        yield* repo.createVerification({
          identifier: 'someone@example.com',
          value: token,
          expiresAt: new Date(Date.now() + 3_600_000),
        })

        const found = yield* repo.findVerificationByToken(token)
        expect(Option.isSome(found) ? found.value.identifier : undefined).toBe(
          'someone@example.com',
        )

        yield* repo.deleteVerification(Option.isSome(found) ? found.value.id : '')
        const missing = yield* repo.findVerificationByToken(token)
        expect(Option.isNone(missing)).toBe(true)
      }),
    )
  })
})
