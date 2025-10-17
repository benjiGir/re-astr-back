import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

export class UploadTestFileDto {
  @ApiProperty({
    description: 'Test ID this file belongs to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  testId!: string

  @ApiProperty({
    description: 'File type',
    enum: ['screenshot', 'report', 'documentation', 'other'],
  })
  @IsEnum(['screenshot', 'report', 'documentation', 'other'])
  fileType!: 'screenshot' | 'report' | 'documentation' | 'other'

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: {
      description: 'Rapport complet',
      pages: 12,
    },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>

  @ApiPropertyOptional({
    description: 'Expiration date (ISO 8601)',
    example: '2026-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string
}
