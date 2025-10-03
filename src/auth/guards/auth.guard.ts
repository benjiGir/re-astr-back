import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException
} from '@nestjs/common'
import { AuthService } from '../auth.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const sessionToken = this.extractSessionToken(request)

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided')
    }

    try {
      const sessionData = await this.authService.verifySession(sessionToken)

      if (!sessionData?.session) {
        throw new UnauthorizedException('Invalid session')
      }

      // Use headers to pass user data as recommended for Fastify compatibility
      request.headers['x-user-id'] = sessionData.session.userId
      request.headers['x-session-id'] = sessionData.session.id

      return true
    } catch (error) {
      throw new UnauthorizedException('Authentication failed')
    }
  }

  private extractSessionToken(request: any): string | null {
    const cookies = request.cookies
    return cookies?.['better-auth.session_token'] || null
  }
}