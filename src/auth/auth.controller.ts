import { LoggerService } from '@common/logger/logger.service'
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import {
  ForgotPasswordBodyDto,
  ResetPasswordBodyDto,
  SignInBodyDto,
  SignUpBodyDto,
} from './dto/auth-body.dto'
import {
  AuthResponseDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
  SessionResponseDto,
  SignOutResponseDto,
} from './dto/auth-response.dto'
import { RequestConverterService } from './services/request-converter.service'
import { ResponseHandlerService } from './services/response-handler.service'

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly requestConverter: RequestConverterService,
    private readonly responseHandler: ResponseHandlerService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AuthController.name)
  }

  @Post('sign-up/email')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async signUp(
    @Body() body: SignUpBodyDto,
    @Req() request: any,
    @Res({ passthrough: false }) reply: any,
  ): Promise<void> {
    await this.handleAuthRequest(request, reply, '/sign-up/email', body)
  }

  @Post('sign-in/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in a user' })
  @ApiResponse({ status: 200, description: 'User successfully signed in', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(
    @Body() body: SignInBodyDto,
    @Req() request: any,
    @Res({ passthrough: false }) reply: any,
  ): Promise<void> {
    await this.handleAuthRequest(request, reply, '/sign-in/email', body)
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Sign out the current user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully signed out',
    type: SignOutResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async signOut(@Req() request: any, @Res({ passthrough: false }) reply: any): Promise<void> {
    try {
      // Extraire le token de session depuis les cookies Fastify parsés
      const cookieValue = request.cookies?.['better-auth.session_token']

      if (!cookieValue) {
        reply.status(401).send({ error: 'No session token found' })
        return
      }

      // Better Auth signe ses cookies avec son propre secret (BETTER_AUTH_SECRET)
      // Le format est: token.signature - on extrait juste la partie token
      const sessionToken = cookieValue.split('.')[0]

      // Vérifier la session
      const session = await this.authService.verifySession(sessionToken)

      if (!session) {
        reply.status(401).send({ error: 'Invalid or expired session' })
        return
      }

      // Supprimer la session de la base de données
      await this.authService.deleteSession(sessionToken)

      // Supprimer le cookie côté client
      reply.clearCookie('better-auth.session_token', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      })

      reply.status(200).send({ success: true })
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Sign out failed',
      )
      this.responseHandler.handleAuthError(error, reply, {
        url: '/sign-out',
        method: 'POST',
      })
    }
  }

  @Get('get-session')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current session' })
  @ApiResponse({ status: 200, description: 'Current session retrieved', type: SessionResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getSession(@Req() request: any, @Res({ passthrough: false }) reply: any): Promise<void> {
    try {
      // Extraire le token de session depuis les cookies Fastify parsés
      const cookieValue = request.cookies?.['better-auth.session_token']

      if (!cookieValue) {
        reply.status(401).send({ error: 'Not authenticated' })
        return
      }

      // Better Auth signe ses cookies - extraire la partie token
      const sessionToken = cookieValue.split('.')[0]

      // Vérifier la session
      const result = await this.authService.verifySession(sessionToken)

      if (result) {
        reply.status(200).send({
          session: result.session,
          user: result.user,
        })
      } else {
        reply.status(401).send({ error: 'Not authenticated' })
      }
    } catch (error) {
      this.logger.error({ error: error instanceof Error ? error.message : 'Unknown' }, 'Get session failed')
      reply.status(500).send({ error: 'Internal server error' })
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(
    @Body() body: ForgotPasswordBodyDto,
    @Req() request: any,
    @Res({ passthrough: false }) reply: any,
  ): Promise<void> {
    await this.handleAuthRequest(request, reply, '/forget-password', body)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password successfully reset',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() body: ResetPasswordBodyDto,
    @Req() request: any,
    @Res({ passthrough: false }) reply: any,
  ): Promise<void> {
    await this.handleAuthRequest(request, reply, '/reset-password', body)
  }

  private async handleAuthRequest(
    request: any,
    reply: any,
    authPath: string,
    body?: any,
  ): Promise<void> {
    if (!this.authService.auth) {
      return this.responseHandler.handleServiceNotReady(reply)
    }

    try {
      const modifiedRequest = {
        url: authPath,
        method: request.method,
        headers: request.headers,
        body: body || request.body,
        hostname: request.hostname,
        ip: request.ip,
        protocol: request.protocol,
      }

      const betterAuthRequest = this.requestConverter.convertFastifyToBetterAuth(
        modifiedRequest as any,
      )
      const response = await this.authService.auth.handler(betterAuthRequest)

      await this.responseHandler.handleBetterAuthResponse(response, reply)
    } catch (error) {
      this.responseHandler.handleAuthError(error, reply, {
        url: authPath,
        method: request.method,
      })
    }
  }
}
