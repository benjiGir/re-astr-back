import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTestDto } from '@modules/tests/dto/create-test.dto';
import { UpdateTestDto } from '@modules/tests/dto/update-test.dto';
import { TESTS_REPOSITORY, type ITestsRepository } from '@modules/tests/interfaces/tests-repository.interface';
import { CategoriesService } from '@modules/categories/services/categories.service';
import { SchemaValidationService } from '@common/validation/schema-validation.service';
import type { BaseSchema, CustomFieldsSchema } from '@common/validation/schema.types';

@Injectable()
export class TestsService {
  constructor(
    @Inject(TESTS_REPOSITORY)
    private readonly testsRepository: ITestsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly schemaValidationService: SchemaValidationService,
  ) {}

  async create(createTestDto: CreateTestDto, userId: string) {
    // Verify category exists and get schema
    const category = await this.categoriesService.findOne(createTestDto.categoryId);

    // Validate commonData against baseSchema
    const commonDataValidation = this.schemaValidationService.validateCommonData(
      createTestDto.commonData,
      category.baseSchema as BaseSchema,
    );
    this.schemaValidationService.validateOrThrow(commonDataValidation, 'commonData');

    // Validate customData against customFieldsSchema
    const customData = createTestDto.customData || {};
    const customDataValidation = this.schemaValidationService.validateCustomData(
      customData,
      category.customFieldsSchema as CustomFieldsSchema,
    );
    this.schemaValidationService.validateOrThrow(customDataValidation, 'customData');

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
    });
  }

  async findAll() {
    return this.testsRepository.findAll();
  }

  async findOne(id: string) {
    const test = await this.testsRepository.findById(id);

    if (!test) {
      throw new NotFoundException(`Test with ID ${id} not found`);
    }

    return test;
  }

  async findByCategory(categoryId: string) {
    // Verify category exists
    await this.categoriesService.findOne(categoryId);

    return this.testsRepository.findByCategory(categoryId);
  }

  async update(id: string, updateTestDto: UpdateTestDto, userId: string) {
    // Verify test exists
    const test = await this.findOne(id);

    // Determine which category schema to use
    const categoryId = updateTestDto.categoryId || test.categoryId;
    const category = await this.categoriesService.findOne(categoryId);

    // Validate commonData if provided
    if (updateTestDto.commonData) {
      const commonDataValidation = this.schemaValidationService.validateCommonData(
        updateTestDto.commonData,
        category.baseSchema as BaseSchema,
      );
      this.schemaValidationService.validateOrThrow(commonDataValidation, 'commonData');
    }

    // Validate customData if provided
    if (updateTestDto.customData !== undefined) {
      const customDataValidation = this.schemaValidationService.validateCustomData(
        updateTestDto.customData,
        category.customFieldsSchema as CustomFieldsSchema,
      );
      this.schemaValidationService.validateOrThrow(customDataValidation, 'customData');
    }

    const updateData: any = {
      ...updateTestDto,
      updatedBy: userId,
    };

    // Set completedAt if status is being changed to 'completed'
    if (updateTestDto.status === 'completed') {
      updateData.completedAt = new Date();
    }

    return this.testsRepository.update(id, updateData);
  }

  async remove(id: string) {
    // Verify test exists
    await this.findOne(id);

    await this.testsRepository.delete(id);

    return { message: `Test with ID ${id} has been deleted` };
  }
}