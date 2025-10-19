import type { BaseSchema, CustomFieldsSchema } from '@common/validation/schema.types'
import { SchemaValidationService } from '@common/validation/schema-validation.service'
import { CategoriesService } from '@modules/categories/services/categories.service'
import type { CreateTestDto } from '@modules/tests/dto/create-test.dto'
import type { UpdateTestDto } from '@modules/tests/dto/update-test.dto'
import {
  type ITestsRepository,
  TESTS_REPOSITORY,
} from '@modules/tests/interfaces/tests-repository.interface'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class TestsService {
  constructor(
    @Inject(TESTS_REPOSITORY)
    private readonly testsRepository: ITestsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly schemaValidationService: SchemaValidationService,
  ) {}

  async create(createTestDto: CreateTestDto, userId: string) {
    const category = await this.categoriesService.findOne(createTestDto.categoryId)

    const commonDataValidation = this.schemaValidationService.validateCommonData(
      createTestDto.commonData,
      category.baseSchema as BaseSchema,
    )
    this.schemaValidationService.validateOrThrow(commonDataValidation, 'commonData')

    const customData = createTestDto.customData || {}
    const customDataValidation = this.schemaValidationService.validateCustomData(
      customData,
      category.customFieldsSchema as CustomFieldsSchema,
    )
    this.schemaValidationService.validateOrThrow(customDataValidation, 'customData')

    return this.testsRepository.create({
      categoryId: createTestDto.categoryId,
      name: createTestDto.name,
      description: createTestDto.description,
      status: createTestDto.status || 'draft',
      commonData: createTestDto.commonData,
      customData,
      metadata: createTestDto.metadata || {},
      createdBy: userId,
      updatedBy: userId,
    })
  }

  async findAll() {
    return this.testsRepository.findAll()
  }

  async findOne(id: string) {
    const test = await this.testsRepository.findById(id)

    if (!test) {
      throw new NotFoundException(`Test with ID ${id} not found`)
    }

    return test
  }

  async findByCategory(categoryId: string) {
    await this.categoriesService.findOne(categoryId)

    return this.testsRepository.findByCategory(categoryId)
  }

  async update(id: string, updateTestDto: UpdateTestDto, userId: string) {
    const test = await this.findOne(id)

    const categoryId = updateTestDto.categoryId || test.categoryId
    const category = await this.categoriesService.findOne(categoryId)

    if (updateTestDto.commonData) {
      const commonDataValidation = this.schemaValidationService.validateCommonData(
        updateTestDto.commonData,
        category.baseSchema as BaseSchema,
      )
      this.schemaValidationService.validateOrThrow(commonDataValidation, 'commonData')
    }

    if (updateTestDto.customData !== undefined) {
      const customDataValidation = this.schemaValidationService.validateCustomData(
        updateTestDto.customData,
        category.customFieldsSchema as CustomFieldsSchema,
      )
      this.schemaValidationService.validateOrThrow(customDataValidation, 'customData')
    }

    const updateData: any = {
      ...updateTestDto,
      updatedBy: userId,
    }

    if (updateTestDto.status === 'completed') {
      updateData.completedAt = new Date()
    }

    return this.testsRepository.update(id, updateData)
  }

  async remove(id: string) {
    await this.findOne(id)

    await this.testsRepository.delete(id)

    return { message: `Test with ID ${id} has been deleted` }
  }
}
