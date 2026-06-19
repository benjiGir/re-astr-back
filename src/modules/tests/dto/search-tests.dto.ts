import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export class SearchTestsDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsString()
  @IsOptional()
  categoryId?: string

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsString()
  @IsOptional()
  projectId?: string

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['draft', 'in_progress', 'completed', 'failed', 'archived'],
  })
  @IsEnum(['draft', 'in_progress', 'completed', 'failed', 'archived'])
  @IsOptional()
  status?: 'draft' | 'in_progress' | 'completed' | 'failed' | 'archived'

  @ApiPropertyOptional({
    description: 'Free-text search across name, description, author, and tags',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  search?: string
}
