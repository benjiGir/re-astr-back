import type { CreateCategoryDto } from '@modules/categories/dto/create-category.dto'
import type { UpdateCategoryDto } from '@modules/categories/dto/update-category.dto'
import {
  CATEGORIES_REPOSITORY,
  type ICategoriesRepository,
} from '@modules/categories/interfaces/categories-repository.interface'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { PinoLogger } from 'nestjs-pino'

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORIES_REPOSITORY)
    private readonly categoriesRepository: ICategoriesRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CategoriesService.name)
  }

  async create(createCategoryDto: CreateCategoryDto) {
    this.logger.info({ name: createCategoryDto.name }, 'Creating new category')

    const category = await this.categoriesRepository.create({
      name: createCategoryDto.name,
      description: createCategoryDto.description,
      baseSchema: createCategoryDto.baseSchema,
      customFieldsSchema: createCategoryDto.customFieldsSchema || {
        allowCustomFields: true,
        maxCustomFields: 10,
        allowedTypes: ['text', 'number', 'boolean', 'date'],
        fields: [],
      },
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
