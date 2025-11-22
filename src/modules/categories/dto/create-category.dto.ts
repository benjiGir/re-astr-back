import type { BaseSchema, CustomFieldsSchema } from '@common/validation/schema.types'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Tests de Température',
  })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Validation des composants électroniques sous différentes conditions thermiques',
  })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({
    description: 'Base schema defining common fields for all tests in this category',
    example: {
      fields: [
        {
          key: 'temperature',
          label: 'Température (°C)',
          type: 'number',
          required: true,
          validation: { min: -50, max: 150 },
        },
      ],
    },
  })
  @IsObject()
  baseSchema!: BaseSchema

  @ApiPropertyOptional({
    description: 'Custom fields schema rules',
    example: {
      allowCustomFields: true,
      maxCustomFields: 10,
      allowedTypes: ['text', 'number', 'boolean', 'date'],
    },
  })
  @IsObject()
  @IsOptional()
  customFieldsSchema?: CustomFieldsSchema
}
