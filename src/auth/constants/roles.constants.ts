import type { UserRole } from '@database/schema/users.schema'

/**
 * Role hierarchy levels (higher number = more permissions)
 * master > archivist > contributor > user
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  master: 4,
  archivist: 3,
  contributor: 2,
  user: 1,
}

/**
 * Check if a user role has sufficient permissions for a required role
 * A role can access resources if its hierarchy level >= required role level
 */
export function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if a user has any of the required roles
 */
export function hasAnyRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.some((requiredRole) => hasRequiredRole(userRole, requiredRole))
}
