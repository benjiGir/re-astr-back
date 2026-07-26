import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { HttpApiError } from 'effect/unstable/httpapi'
import type { UserRole } from '@/domain/schema/users.schema.js'
import { CurrentUser } from '@/auth/CurrentUser.js'
import { hasRequiredRole, requireRole, requireSelfOrRole } from '@/auth/Role.js'

const now = new Date('2026-01-01T00:00:00.000Z')

const mockUser = (role: UserRole, id = 'user-1'): typeof CurrentUser.Service => ({
  id,
  email: 'user@example.com',
  name: 'Test User',
  role,
  emailVerified: true,
  createdAt: now,
  updatedAt: now,
  session: {
    id: 'session-1',
    token: 'token-1',
    expiresAt: now,
    ipAddress: null,
    userAgent: null,
  },
})

describe('hasRequiredRole', () => {
  it.each<[UserRole, UserRole, boolean]>([
    ['master', 'master', true],
    ['master', 'archivist', true],
    ['master', 'contributor', true],
    ['master', 'user', true],
    ['archivist', 'archivist', true],
    ['archivist', 'master', false],
    ['contributor', 'archivist', false],
    ['contributor', 'contributor', true],
    ['contributor', 'user', true],
    ['user', 'user', true],
    ['user', 'contributor', false],
  ])('role %s vs required %s -> %s', (userRole, requiredRole, expected) => {
    expect(hasRequiredRole(userRole, requiredRole)).toBe(expected)
  })
})

describe('requireRole', () => {
  it.layer(Layer.succeed(CurrentUser, mockUser('archivist')))((it) => {
    it.effect('succeeds when the user meets the required role', () =>
      requireRole('contributor')
    )
  })

  it.layer(Layer.succeed(CurrentUser, mockUser('user')))((it) => {
    it.effect('fails with Forbidden when the user is below the required role', () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(requireRole('archivist'))
        expect(error).toBeInstanceOf(HttpApiError.Forbidden)
      }),
    )
  })
})

describe('requireSelfOrRole', () => {
  it.layer(Layer.succeed(CurrentUser, mockUser('user', 'user-1')))((it) => {
    it.effect('succeeds when acting on self regardless of role', () =>
      requireSelfOrRole('user-1', 'master')
    )

    it.effect('fails with Forbidden when acting on someone else without the required role', () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(requireSelfOrRole('user-2', 'master'))
        expect(error).toBeInstanceOf(HttpApiError.Forbidden)
      }),
    )
  })

  it.layer(Layer.succeed(CurrentUser, mockUser('master', 'user-1')))((it) => {
    it.effect('succeeds when acting on someone else with a sufficient role', () =>
      requireSelfOrRole('user-2', 'master')
    )
  })
})
