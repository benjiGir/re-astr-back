import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuthGuard } from './guards/auth.guard'
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator'
import { SignUpDto, SignInDto } from './dto/auth.dto'

@ApiTags('Test Auth Endpoints')
@Controller('test')
export class TestController {
  @Get('public')
  @ApiOperation({ summary: 'Public endpoint - no auth required' })
  getPublic() {
    return {
      message: 'This is a public endpoint',
      timestamp: new Date().toISOString()
    }
  }

  @Get('protected')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Protected endpoint - requires authentication' })
  getProtected(@CurrentUser() user: CurrentUserData) {
    return {
      message: 'This is a protected endpoint',
      user: {
        userId: user.userId,
        sessionId: user.sessionId
      },
      timestamp: new Date().toISOString()
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  getMe(@CurrentUser() user: CurrentUserData) {
    return {
      message: 'Current user information',
      userId: user.userId,
      sessionId: user.sessionId
    }
  }
}