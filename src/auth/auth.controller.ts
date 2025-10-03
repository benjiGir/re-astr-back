import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RequestConverterService } from './services/request-converter.service'
import { ResponseHandlerService } from './services/response-handler.service'
import {
  SignUpBodyDto,
  SignInBodyDto,
  ForgotPasswordBodyDto,
  ResetPasswordBodyDto,
} from './dto/auth-body.dto'
import {
  AuthResponseDto,
  SignOutResponseDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
  SessionResponseDto,
} from './dto/auth-response.dto'

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly requestConverter: RequestConverterService,
    private readonly responseHandler: ResponseHandlerService,
  ) {}

  @Post('sign-up')
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
    await this.handleAuthRequest(request, reply, '/auth/sign-up', body)
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in a user' })
  @ApiResponse({ status: 200, description: 'User successfully signed in', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(
    @Body() body: SignInBodyDto,
    @Req() request: any,
    @Res({ passthrough: false }) reply: any,
  ): Promise<void> {
    await this.handleAuthRequest(request, reply, '/auth/sign-in', body)
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Sign out the current user' })
  @ApiResponse({ status: 200, description: 'User successfully signed out', type: SignOutResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async signOut(
    @Req() request: any,
    @Res({ passthrough: false }) reply: any,
  ): Promise<void> {
    await this.handleAuthRequest(request, reply, '/auth/sign-out')
  }

  @Get('session')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current session' })
  @ApiResponse({ status: 200, description: 'Current session retrieved', type: SessionResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getSession(
    @Req() request: any,
    @Res({ passthrough: false }) reply: any,
  ): Promise<void> {
    await this.handleAuthRequest(request, reply, '/auth/get-session')
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent', type: ForgotPasswordResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(
    @Body() body: ForgotPasswordBodyDto,
    @Req() request: any,
    @Res({ passthrough: false }) reply: any,
  ): Promise<void> {
    await this.handleAuthRequest(request, reply, '/auth/forgot-password', body)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset', type: ResetPasswordResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() body: ResetPasswordBodyDto,
    @Req() request: any,
    @Res({ passthrough: false }) reply: any,
  ): Promise<void> {
    await this.handleAuthRequest(request, reply, '/auth/reset-password', body)
  }

  /**
   * Méthode générique pour gérer les requêtes d'authentification
   */
  private async handleAuthRequest(
    request: any,
    reply: any,
    authPath: string,
    body?: any,
  ): Promise<void> {
    // Vérifier si le service d'authentification est prêt
    if (!this.authService.auth) {
      return this.responseHandler.handleServiceNotReady(reply)
    }

    try {
      // Créer une copie de la requête avec le path et body modifiés
      const modifiedRequest = {
        ...request,
        url: authPath,
        body: body || request.body,
      }

      // Convertir la requête Fastify en format Better Auth
      const betterAuthRequest = this.requestConverter.convertFastifyToBetterAuth(modifiedRequest)

      // Appeler Better Auth
      const response = await this.authService.auth.handler(betterAuthRequest)

      // Gérer la réponse
      await this.responseHandler.handleBetterAuthResponse(response, reply)
    } catch (error) {
      // Gérer les erreurs
      this.responseHandler.handleAuthError(error, reply, {
        url: authPath,
        method: request.method,
      })
    }
  }
}