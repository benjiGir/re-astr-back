import type { UserRole } from '@database/schema/users.schema';

/**
 * Role hierarchy levels (higher number = more permissions)
 * master > archivist > contributor > user
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  master: 4, // Super admin - all permissions
  archivist: 3, // Archive manager - manage all archives
  contributor: 2, // Can create and edit content
  user: 1, // Read-only access
};

/**
 * Check if a user role has sufficient permissions for a required role
 * A role can access resources if its hierarchy level >= required role level
 */
export function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user has any of the required roles
 */
export function hasAnyRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.some((requiredRole) => hasRequiredRole(userRole, requiredRole));
}