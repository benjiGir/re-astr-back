import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTestDto } from '@modules/tests/dto/create-test.dto';
import { UpdateTestDto } from '@modules/tests/dto/update-test.dto';
import { TESTS_REPOSITORY, type ITestsRepository } from '@modules/tests/interfaces/tests-repository.interface';
import { CategoriesService } from '@modules/categories/services/categories.service';

@Injectable()
export class TestsService {
  constructor(
    @Inject(TESTS_REPOSITORY)
    private readonly testsRepository: ITestsRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(createTestDto: CreateTestDto, userId: string) {
    // Verify category exists
    await this.categoriesService.findOne(createTestDto.categoryId);

    return this.testsRepository.create({
      categoryId: createTestDto.categoryId,
      name: createTestDto.name,
      description: createTestDto.description,
      status: createTestDto.status || 'draft',
      commonData: createTestDto.commonData,
      customData: createTestDto.customData || {},
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
    await this.findOne(id);

    // If categoryId is being changed, verify new category exists
    if (updateTestDto.categoryId) {
      await this.categoriesService.findOne(updateTestDto.categoryId);
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