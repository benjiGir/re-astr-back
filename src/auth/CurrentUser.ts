import { Context } from 'effect'
import type { UserRole } from '@/domain/schema/users.schema.js'

/**
 * Provided by the Authorization middleware — never constructed directly.
 * Replaces both the old header-based `x-user-role` (spoofable, Faille #1) and
 * the never-populated `request.user` behind `@User()` (Faille #2).
 *
 * Carries the full user row plus the session that authenticated this request
 * (not just its id) — Phase 5's sign-out/get-session need the session's
 * token/expiresAt/ipAddress/userAgent, and Authorization already fetches both
 * rows on every request, so widening what it hands over costs nothing extra.
 */
export class CurrentUser extends Context.Service<
  CurrentUser,
  {
    readonly id: string
    readonly email: string
    readonly name: string
    readonly role: UserRole
    readonly emailVerified: boolean
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly session: {
      readonly id: string
      readonly token: string
      readonly expiresAt: Date
      readonly ipAddress: string | null
      readonly userAgent: string | null
    }
  }
>()('CurrentUser') {}
