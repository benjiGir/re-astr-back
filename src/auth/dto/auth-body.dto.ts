import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

export class SignUpBodyDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  name?: string
}

export class SignInBodyDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password!: string
}

export class ForgotPasswordBodyDto {
  @ApiProperty({
    description: 'Email address to send reset link',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @ApiProperty({
    description: 'Redirect URL after password reset',
    example: 'http://localhost:3000/reset-password',
    required: false,
  })
  @IsString()
  redirectTo?: string
}

export class ResetPasswordBodyDto {
  @ApiProperty({
    description: 'New password',
    example: 'NewSecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string

  @ApiProperty({
    description: 'Password reset token',
    example: 'reset-token-here',
  })
  @IsString()
  @IsNotEmpty()
  token!: string
}

export class VerifyEmailBodyDto {
  @ApiProperty({
    description: 'Email verification token',
    example: 'verification-token-here',
  })
  @IsString()
  @IsNotEmpty()
  token!: string
}
