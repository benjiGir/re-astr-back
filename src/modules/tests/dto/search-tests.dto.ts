import { testStatusEnum } from '@database/schema/tests.schema'
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
    enum: testStatusEnum.enumValues,
  })
  @IsEnum(testStatusEnum.enumValues)
  @IsOptional()
  status?: (typeof testStatusEnum.enumValues)[number]

  @ApiPropertyOptional({
    description: 'Free-text search across name, description, author, and tags',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  search?: string
}
