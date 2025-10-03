import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface CurrentUserData {
  userId: string
  sessionId: string
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest()

    // Extract user data from headers as set by the AuthGuard
    const userId = request.headers['x-user-id'] as string
    const sessionId = request.headers['x-session-id'] as string

    if (!userId || !sessionId) {
      throw new Error('User data not found in request headers')
    }

    return {
      userId,
      sessionId
    }
  }
)