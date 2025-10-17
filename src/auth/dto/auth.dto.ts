import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength } from 'class-validator'

export class SignUpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string

  @ApiProperty({ example: 'username', minLength: 3 })
  @IsString()
  @MinLength(3)
  username!: string
}

export class SignInDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string
}
