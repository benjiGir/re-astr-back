import { beforeEach, describe, expect, layer } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { CredentialsRepo, CredentialsRepoLive } from '@/auth/CredentialsRepo.js'
import { UsersRepo, UsersRepoLive } from '@/modules/users/UsersRepo.js'
import { DatabaseTestLive, truncateAll } from '@/test/DbTestLayer.js'

const MISSING_ID = '00000000-0000-0000-0000-000000000000'
let counter = 0
const uniqueEmail = () => `user-${Date.now()}-${counter++}@example.com`

const createUserFixture = Effect.fn('createUserFixture')(function* () {
  const credentialsRepo = yield* CredentialsRepo
  return yield* credentialsRepo.createUser({ email: uniqueEmail(), name: 'Fixture User' })
})

describe('UsersRepo', () => {
  layer(Layer.mergeAll(UsersRepoLive, CredentialsRepoLive).pipe(Layer.provide(DatabaseTestLive)))(
    (it) => {
      beforeEach(() => truncateAll())

      it.effect('findAll returns every created row', () =>
        Effect.gen(function* () {
          yield* createUserFixture()
          yield* createUserFixture()
          const repo = yield* UsersRepo
          const all = yield* repo.findAll
          expect(all.length).toBe(2)
        }),
      )

      it.effect('findById finds an existing row and returns None for a missing one', () =>
        Effect.gen(function* () {
          const user = yield* createUserFixture()
          const repo = yield* UsersRepo

          const found = yield* repo.findById(user.id)
          expect(Option.isSome(found) ? found.value.id : undefined).toBe(user.id)

          const missing = yield* repo.findById(MISSING_ID)
          expect(Option.isNone(missing)).toBe(true)
        }),
      )

      it.effect('update patches only the provided fields', () =>
        Effect.gen(function* () {
          const user = yield* createUserFixture()
          const repo = yield* UsersRepo
          const updated = yield* repo.update(user.id, { name: 'Renamed' })
          expect(Option.isSome(updated) ? updated.value.name : undefined).toBe('Renamed')
          expect(Option.isSome(updated) ? updated.value.email : undefined).toBe(user.email)
        }),
      )

      it.effect('assignRole updates the role', () =>
        Effect.gen(function* () {
          const user = yield* createUserFixture()
          const repo = yield* UsersRepo
          const updated = yield* repo.assignRole(user.id, 'archivist')
          expect(Option.isSome(updated) ? updated.value.role : undefined).toBe('archivist')
        }),
      )

      it.effect('remove deletes the row', () =>
        Effect.gen(function* () {
          const user = yield* createUserFixture()
          const repo = yield* UsersRepo
          yield* repo.remove(user.id)
          const found = yield* repo.findById(user.id)
          expect(Option.isNone(found)).toBe(true)
        }),
      )
    },
  )
})
