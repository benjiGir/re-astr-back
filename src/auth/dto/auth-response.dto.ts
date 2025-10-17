import { ApiProperty } from '@nestjs/swagger'

export class UserDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'cm36pnnde0000zz8i5w7y56vd',
  })
  id!: string

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email!: string

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    required: false,
  })
  name?: string

  @ApiProperty({
    description: 'Email verification status',
    example: false,
  })
  emailVerified!: boolean

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt!: Date

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt!: Date
}

export class SessionDto {
  @ApiProperty({
    description: 'Session unique identifier',
    example: 'cm36pnnde0001zz8i5w7y56ve',
  })
  id!: string

  @ApiProperty({
    description: 'Session expiration timestamp',
    example: '2024-01-08T00:00:00.000Z',
  })
  expiresAt!: Date

  @ApiProperty({
    description: 'Session token',
    example: 'session-token-here',
  })
  token!: string

  @ApiProperty({
    description: 'IP address of the session',
    example: '127.0.0.1',
    required: false,
  })
  ipAddress?: string

  @ApiProperty({
    description: 'User agent of the session',
    example: 'Mozilla/5.0...',
    required: false,
  })
  userAgent?: string
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Authenticated user information',
    type: UserDto,
  })
  user!: UserDto

  @ApiProperty({
    description: 'Session information',
    type: SessionDto,
  })
  session!: SessionDto
}

export class SignOutResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Successfully signed out',
  })
  message!: string

  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success!: boolean
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password reset email sent',
  })
  message!: string

  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success!: boolean
}

export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password successfully reset',
  })
  message!: string

  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success!: boolean
}

export class SessionResponseDto {
  @ApiProperty({
    description: 'Current user information',
    type: UserDto,
    required: false,
  })
  user?: UserDto

  @ApiProperty({
    description: 'Current session information',
    type: SessionDto,
    required: false,
  })
  session?: SessionDto
}
