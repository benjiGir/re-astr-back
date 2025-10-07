import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@database/schema/users.schema';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route or controller
 * Roles are checked hierarchically - higher roles inherit permissions from lower ones
 *
 * @example
 * // Only master can access
 * @Roles('master')
 *
 * @example
 * // Both master and archivist can access (and master since it's higher)
 * @Roles('archivist')
 *
 * @example
 * // Multiple specific roles (not hierarchical, must match one)
 * @Roles('master', 'archivist')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);