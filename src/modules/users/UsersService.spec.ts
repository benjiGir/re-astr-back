import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import type { User as UserRow } from '@/domain/schema/users.schema.js'
import { UserNotFound } from '@/modules/users/User.js'
import { UsersRepo } from '@/modules/users/UsersRepo.js'
import { UsersService, UsersServiceLive } from '@/modules/users/UsersService.js'

const now = new Date('2026-01-01T00:00:00.000Z')

const mockRow: UserRow = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  emailVerified: true,
  image: null,
  role: 'contributor',
  createdAt: now,
  updatedAt: now,
}

const makeMockRepo = (overrides: Partial<typeof UsersRepo.Service> = {}) => ({
  findAll: Effect.succeed([mockRow]),
  findById: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  update: vi.fn(() => Effect.succeed(Option.some(mockRow))),
  assignRole: vi.fn(() => Effect.succeed(Option.some({ ...mockRow, role: 'master' as const }))),
  remove: vi.fn(() => Effect.void),
  ...overrides,
})

const runWithRepo = <A, E>(
  repo: typeof UsersRepo.Service,
  effect: Effect.Effect<A, E, UsersService>,
) => Effect.provide(effect, UsersServiceLive.pipe(Layer.provide(Layer.succeed(UsersRepo, repo))))

describe('UsersService', () => {
  it.effect('findAll returns all users', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* UsersService
        const users = yield* service.findAll
        expect(users).toHaveLength(1)
        expect(users[0]?.id).toBe('user-1')
      }),
    ),
  )

  it.effect('findOne fails with UserNotFound when the repo returns none', () =>
    runWithRepo(
      makeMockRepo({ findById: vi.fn(() => Effect.succeed(Option.none())) }),
      Effect.gen(function* () {
        const service = yield* UsersService
        const error = yield* Effect.flip(service.findOne('missing-id'))
        expect(error).toBeInstanceOf(UserNotFound)
      }),
    ),
  )

  it.effect('findOne returns the user when the repo finds a row', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* UsersService
        const user = yield* service.findOne('user-1')
        expect(user.email).toBe('jane@example.com')
      }),
    ),
  )

  it.effect('update fails with UserNotFound and never calls repo.update', () => {
    const updateFn = vi.fn(() => Effect.succeed(Option.some(mockRow)))

    return runWithRepo(
      makeMockRepo({ findById: vi.fn(() => Effect.succeed(Option.none())), update: updateFn }),
      Effect.gen(function* () {
        const service = yield* UsersService
        const error = yield* Effect.flip(service.update('missing-id', { name: 'New Name' }))
        expect(error).toBeInstanceOf(UserNotFound)
        expect(updateFn).not.toHaveBeenCalled()
      }),
    )
  })

  it.effect('update fails with UserNotFound when the repo update itself returns none', () =>
    runWithRepo(
      makeMockRepo({ update: vi.fn(() => Effect.succeed(Option.none())) }),
      Effect.gen(function* () {
        const service = yield* UsersService
        const error = yield* Effect.flip(service.update('user-1', { name: 'New Name' }))
        expect(error).toBeInstanceOf(UserNotFound)
      }),
    ),
  )

  it.effect('update succeeds when the user exists', () =>
    runWithRepo(
      makeMockRepo({
        update: vi.fn(() => Effect.succeed(Option.some({ ...mockRow, name: 'New Name' }))),
      }),
      Effect.gen(function* () {
        const service = yield* UsersService
        const user = yield* service.update('user-1', { name: 'New Name' })
        expect(user.name).toBe('New Name')
      }),
    ),
  )

  it.effect('assignRole updates the role', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* UsersService
        const user = yield* service.assignRole('user-1', 'master')
        expect(user.role).toBe('master')
      }),
    ),
  )

  it.effect('assignRole fails with UserNotFound when the repo assignRole itself returns none', () =>
    runWithRepo(
      makeMockRepo({ assignRole: vi.fn(() => Effect.succeed(Option.none())) }),
      Effect.gen(function* () {
        const service = yield* UsersService
        const error = yield* Effect.flip(service.assignRole('user-1', 'master'))
        expect(error).toBeInstanceOf(UserNotFound)
      }),
    ),
  )

  it.effect('assignRole fails with UserNotFound and never calls repo.assignRole', () => {
    const assignRoleFn = vi.fn(() => Effect.succeed(Option.some(mockRow)))

    return runWithRepo(
      makeMockRepo({
        findById: vi.fn(() => Effect.succeed(Option.none())),
        assignRole: assignRoleFn,
      }),
      Effect.gen(function* () {
        const service = yield* UsersService
        const error = yield* Effect.flip(service.assignRole('missing-id', 'master'))
        expect(error).toBeInstanceOf(UserNotFound)
        expect(assignRoleFn).not.toHaveBeenCalled()
      }),
    )
  })

  it.effect('remove fails with UserNotFound and never calls repo.remove', () => {
    const removeFn = vi.fn(() => Effect.void)

    return runWithRepo(
      makeMockRepo({ findById: vi.fn(() => Effect.succeed(Option.none())), remove: removeFn }),
      Effect.gen(function* () {
        const service = yield* UsersService
        const error = yield* Effect.flip(service.remove('missing-id'))
        expect(error).toBeInstanceOf(UserNotFound)
        expect(removeFn).not.toHaveBeenCalled()
      }),
    )
  })

  it.effect('remove succeeds when the user exists', () =>
    runWithRepo(
      makeMockRepo(),
      Effect.gen(function* () {
        const service = yield* UsersService
        yield* service.remove('user-1')
      }),
    ),
  )
})
