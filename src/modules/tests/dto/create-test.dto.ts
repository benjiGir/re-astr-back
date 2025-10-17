import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

export class CreateTestDto {
  @ApiProperty({
    description: 'Category ID this test belongs to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  categoryId!: string

  @ApiProperty({
    description: 'Test name',
    example: 'Test thermal cycling - PCB Rev 2.3',
  })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({
    description: 'Test description',
    example: 'Validation de la résistance aux cycles thermiques',
  })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({
    description: 'Test status',
    enum: ['draft', 'in_progress', 'completed', 'failed', 'archived'],
    default: 'draft',
  })
  @IsEnum(['draft', 'in_progress', 'completed', 'failed', 'archived'])
  @IsOptional()
  status?: 'draft' | 'in_progress' | 'completed' | 'failed' | 'archived'

  @ApiProperty({
    description: 'Common data based on category base schema',
    example: {
      temperature: 85,
      humidity: 45,
      duration: 48,
    },
  })
  @IsObject()
  commonData!: Record<string, any>

  @ApiPropertyOptional({
    description: 'Custom data fields',
    example: {
      board_revision: 'Rev 2.3',
      serial_number: 'PCB-2024-00342',
    },
  })
  @IsObject()
  @IsOptional()
  customData?: Record<string, any>

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: {
      tags: ['thermal', 'pcb'],
      priority: 'high',
    },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>
}
