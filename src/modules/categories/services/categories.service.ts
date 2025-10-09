import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from '@modules/categories/dto/create-category.dto';
import { UpdateCategoryDto } from '@modules/categories/dto/update-category.dto';
import { CATEGORIES_REPOSITORY, type ICategoriesRepository } from '@modules/categories/interfaces/categories-repository.interface';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORIES_REPOSITORY)
    private readonly categoriesRepository: ICategoriesRepository,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    return this.categoriesRepository.create({
      name: createCategoryDto.name,
      description: createCategoryDto.description,
      baseSchema: createCategoryDto.baseSchema,
      customFieldsSchema: createCategoryDto.customFieldsSchema || {
        allowCustomFields: true,
        maxCustomFields: 10,
        allowedTypes: ['text', 'number', 'boolean', 'date'],
        fields: [],
      },
    });
  }

  async findAll() {
    return this.categoriesRepository.findAll();
  }

  async findOne(id: string) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);

    return this.categoriesRepository.update(id, {
      name: updateCategoryDto.name,
      description: updateCategoryDto.description,
      baseSchema: updateCategoryDto.baseSchema,
      customFieldsSchema: updateCategoryDto.customFieldsSchema,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.categoriesRepository.delete(id);

    return { message: `Category with ID ${id} has been deleted` };
  }
}