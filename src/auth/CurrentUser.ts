import { Context } from 'effect'
import type { UserRole } from '@/domain/schema/users.schema.js'

/**
 * Provided by the Authorization middleware — never constructed directly.
 * Replaces both the old header-based `x-user-role` (spoofable, Faille #1) and
 * the never-populated `request.user` behind `@User()` (Faille #2).
 */
export class CurrentUser extends Context.Service<
  CurrentUser,
  {
    readonly id: string
    readonly email: string
    readonly name: string
    readonly role: UserRole
  }
>()('CurrentUser') {}
