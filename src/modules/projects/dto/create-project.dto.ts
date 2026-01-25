import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name (must be unique)',
    example: 'Avionics System Validation',
  })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Comprehensive testing program for next-generation avionics components',
  })
  @IsString()
  @IsOptional()
  description?: string
}