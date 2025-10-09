import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { UserRole } from '@database/schema/users.schema'

export interface CurrentUserData {
  userId: string
  sessionId: string
  role: UserRole
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest()

    const userId = request.headers['x-user-id'] as string
    const sessionId = request.headers['x-session-id'] as string
    const role = request.headers['x-user-role'] as UserRole

    if (!userId || !sessionId || !role) {
      throw new Error('User data not found in request headers')
    }

    return {
      userId,
      sessionId,
      role
    }
  }
)