import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator'

export class CreateTestFileDto {
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

  @ApiProperty({
    description: 'Original filename',
    example: 'rapport_test.pdf',
  })
  @IsString()
  @IsNotEmpty()
  originalFilename!: string

  @ApiProperty({
    description: 'Stored filename (unique)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf',
  })
  @IsString()
  @IsNotEmpty()
  storedFilename!: string

  @ApiPropertyOptional({
    description: 'Bucket name',
    default: 'test-archives',
  })
  @IsString()
  @IsOptional()
  bucketName?: string

  @ApiProperty({
    description: 'Object key (full path in MinIO)',
    example: 'tests/2025/01/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf',
  })
  @IsString()
  @IsNotEmpty()
  objectKey!: string

  @ApiProperty({
    description: 'File size in bytes',
    example: 1547892,
  })
  @IsNumber()
  fileSize!: number

  @ApiProperty({
    description: 'MIME type',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  mimeType!: string

  @ApiPropertyOptional({
    description: 'SHA-256 checksum',
    example: '7d793037a0760186574b0282f2f435e7',
  })
  @IsString()
  @IsOptional()
  checksum?: string

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
