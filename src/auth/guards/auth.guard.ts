import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException
} from '@nestjs/common'
import { AuthService } from '../auth.service'
import { DatabaseService } from '@database/database.service'
import { users } from '@database/schema/users.schema'
import { eq } from 'drizzle-orm'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly db: DatabaseService,
  ) {}

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

      const [user] = await this.db.drizzle
        .select()
        .from(users)
        .where(eq(users.id, sessionData.session.userId))
        .limit(1)

      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      request.headers['x-user-id'] = sessionData.session.userId
      request.headers['x-session-id'] = sessionData.session.id
      request.headers['x-user-role'] = user.role

      return true
    } catch (error) {
      throw new UnauthorizedException('Authentication failed')
    }
  }

  private extractSessionToken(request: any): string | null {
    const cookies = request.cookies
    const cookieValue = cookies?.['better-auth.session_token']

    if (!cookieValue) {
      return null
    }

    const [token] = cookieValue.split('.')
    return token || null
  }
}