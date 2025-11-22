import { SchemaValidationService } from '@common/validation/schema-validation.service'
import type { CreateCategoryDto } from '@modules/categories/dto/create-category.dto'
import type { UpdateCategoryDto } from '@modules/categories/dto/update-category.dto'
import {
  CATEGORIES_REPOSITORY,
  type ICategoriesRepository,
} from '@modules/categories/interfaces/categories-repository.interface'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORIES_REPOSITORY)
    private readonly categoriesRepository: ICategoriesRepository,
    private readonly logger: PinoLogger,
    private readonly schemaValidationService: SchemaValidationService,
  ) {
    this.logger.setContext(CategoriesService.name)
  }

  async create(createCategoryDto: CreateCategoryDto) {
    this.logger.info({ name: createCategoryDto.name }, 'Creating new category')

    // Validate baseSchema structure
    const baseSchemaValidation =
      this.schemaValidationService.validateBaseSchema(createCategoryDto.baseSchema)
    this.schemaValidationService.validateOrThrow(baseSchemaValidation, 'baseSchema')

    // Prepare customFieldsSchema with defaults
    const customFieldsSchema = createCategoryDto.customFieldsSchema || {
      allowCustomFields: true,
      maxCustomFields: 10,
      allowedTypes: ['text', 'number', 'boolean', 'date'],
      fields: [],
    }

    // Validate customFieldsSchema structure
    const customFieldsSchemaValidation =
      this.schemaValidationService.validateCustomFieldsSchema(customFieldsSchema)
    this.schemaValidationService.validateOrThrow(
      customFieldsSchemaValidation,
      'customFieldsSchema',
    )

    const category = await this.categoriesRepository.create({
      name: createCategoryDto.name,
      description: createCategoryDto.description,
      baseSchema: createCategoryDto.baseSchema,
      customFieldsSchema,
    })

    this.logger.info(
      { categoryId: category.id, name: category.name },
      'Category created successfully',
    )
    return category
  }

  async findAll() {
    return this.categoriesRepository.findAll()
  }

  async findOne(id: string) {
    const category = await this.categoriesRepository.findById(id)

    if (!category) {
      this.logger.warn({ categoryId: id }, 'Category not found')
      throw new NotFoundException(`Category with ID ${id} not found`)
    }

    return category
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    this.logger.info({ categoryId: id }, 'Updating category')

    await this.findOne(id)

    // Validate baseSchema if provided
    if (updateCategoryDto.baseSchema) {
      const baseSchemaValidation =
        this.schemaValidationService.validateBaseSchema(updateCategoryDto.baseSchema)
      this.schemaValidationService.validateOrThrow(baseSchemaValidation, 'baseSchema')
    }

    // Validate customFieldsSchema if provided
    if (updateCategoryDto.customFieldsSchema) {
      const customFieldsSchemaValidation = this.schemaValidationService.validateCustomFieldsSchema(
        updateCategoryDto.customFieldsSchema,
      )
      this.schemaValidationService.validateOrThrow(
        customFieldsSchemaValidation,
        'customFieldsSchema',
      )
    }

    const updated = await this.categoriesRepository.update(id, {
      name: updateCategoryDto.name,
      description: updateCategoryDto.description,
      baseSchema: updateCategoryDto.baseSchema,
      customFieldsSchema: updateCategoryDto.customFieldsSchema,
    })

    this.logger.info({ categoryId: id, name: updated.name }, 'Category updated successfully')
    return updated
  }

  async remove(id: string) {
    this.logger.info({ categoryId: id }, 'Deleting category')

    await this.findOne(id)
    await this.categoriesRepository.delete(id)

    this.logger.info({ categoryId: id }, 'Category deleted successfully')
    return { message: `Category with ID ${id} has been deleted` }
  }
}
