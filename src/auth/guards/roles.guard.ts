import type { UserRole } from '@database/schema/users.schema'
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { hasAnyRole } from '../constants/roles.constants'
import { ROLES_KEY } from '../decorators/roles.decorator'

/**
 * RolesGuard - checks if the authenticated user has the required role(s)
 * Must be used together with AuthGuard
 *
 * @example
 * @UseGuards(AuthGuard, RolesGuard)
 * @Roles('admin', 'editor')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const userRole = request.headers['x-user-role'] as UserRole

    if (!userRole) {
      throw new ForbiddenException('User role not found')
    }

    const hasPermission = hasAnyRole(userRole, requiredRoles)

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      )
    }

    return true
  }
}
