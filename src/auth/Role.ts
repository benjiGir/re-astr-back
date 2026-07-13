import { Effect } from 'effect'
import { HttpApiError } from 'effect/unstable/httpapi'
import type { UserRole } from '@/domain/schema/users.schema.js'
import { CurrentUser } from '@/auth/CurrentUser.js'

/** Higher number = more permissions. master > archivist > contributor > user. */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  master: 4,
  archivist: 3,
  contributor: 2,
  user: 1,
}

export const hasRequiredRole = (userRole: UserRole, requiredRole: UserRole): boolean =>
  ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]

/** Guard clause: `yield* requireRole('archivist')` at the top of a handler. */
export const requireRole = (requiredRole: UserRole): Effect.Effect<void, HttpApiError.Forbidden, CurrentUser> =>
  Effect.flatMap(CurrentUser, (user) =>
    hasRequiredRole(user.role, requiredRole) ? Effect.void : Effect.fail(new HttpApiError.Forbidden()),
  )
