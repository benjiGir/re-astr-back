import type { CreateCategoryDto } from '@modules/categories/dto/create-category.dto'
import type { UpdateCategoryDto } from '@modules/categories/dto/update-category.dto'
import {
  CATEGORIES_REPOSITORY,
  type ICategoriesRepository,
} from '@modules/categories/interfaces/categories-repository.interface'
import { CategoriesService } from '@modules/categories/services/categories.service'
import { NotFoundException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import {
  createMockCategoriesRepository,
  mockCategories,
  mockCategory,
} from './categories.service.mock'

describe('CategoriesService', () => {
  let service: CategoriesService
  let repository: ICategoriesRepository

  beforeEach(async () => {
    const mockRepo = createMockCategoriesRepository()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CATEGORIES_REPOSITORY,
          useValue: mockRepo,
        },
      ],
    }).compile()

    service = module.get<CategoriesService>(CategoriesService)
    repository = module.get<ICategoriesRepository>(CATEGORIES_REPOSITORY)

    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a category with provided data', async () => {
      // Arrange
      const createDto: CreateCategoryDto = {
        name: 'Tests de Température',
        description: 'Validation des composants électroniques',
        baseSchema: {
          fields: [
            {
              key: 'temperature',
              label: 'Température (°C)',
              type: 'number',
              required: true,
            },
          ],
        },
        customFieldsSchema: {
          allowCustomFields: true,
          maxCustomFields: 10,
          allowedTypes: ['text', 'number', 'boolean', 'date'],
          fields: [],
        },
      }

      jest.spyOn(repository, 'create').mockResolvedValue(mockCategory)

      // Act
      const result = await service.create(createDto)

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        baseSchema: createDto.baseSchema,
        customFieldsSchema: createDto.customFieldsSchema,
      })
      expect(result).toEqual(mockCategory)
    })

    it('should create a category with default customFieldsSchema when not provided', async () => {
      // Arrange
      const createDto: CreateCategoryDto = {
        name: 'Tests de Température',
        baseSchema: {
          fields: [
            {
              key: 'temperature',
              label: 'Température (°C)',
              type: 'number',
              required: true,
            },
          ],
        },
      }

      jest.spyOn(repository, 'create').mockResolvedValue(mockCategory)

      // Act
      await service.create(createDto)

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        baseSchema: createDto.baseSchema,
        customFieldsSchema: {
          allowCustomFields: true,
          maxCustomFields: 10,
          allowedTypes: ['text', 'number', 'boolean', 'date'],
          fields: [],
        },
      })
    })
  })

  describe('findAll', () => {
    it('should return an array of categories', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue(mockCategories)

      // Act
      const result = await service.findAll()

      // Assert
      expect(repository.findAll).toHaveBeenCalled()
      expect(result).toEqual(mockCategories)
    })

    it('should return an empty array when no categories exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue([])

      // Act
      const result = await service.findAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('should return a category when found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockCategory)

      // Act
      const result = await service.findOne('123e4567-e89b-12d3-a456-426614174000')

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000')
      expect(result).toEqual(mockCategory)
    })

    it('should throw NotFoundException when category is not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Category with ID non-existent-id not found'),
      )
    })
  })

  describe('update', () => {
    it('should update a category when it exists', async () => {
      // Arrange
      const updateDto: UpdateCategoryDto = {
        name: 'Updated Name',
        description: 'Updated description',
      }

      const updatedCategory = { ...mockCategory, ...updateDto }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockCategory)
      jest.spyOn(repository, 'update').mockResolvedValue(updatedCategory)

      // Act
      const result = await service.update('123e4567-e89b-12d3-a456-426614174000', updateDto)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000')
      expect(repository.update).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', {
        name: updateDto.name,
        description: updateDto.description,
        baseSchema: undefined,
        customFieldsSchema: undefined,
      })
      expect(result).toEqual(updatedCategory)
    })

    it('should throw NotFoundException when trying to update non-existent category', async () => {
      // Arrange
      const updateDto: UpdateCategoryDto = {
        name: 'Updated Name',
      }

      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(
        new NotFoundException('Category with ID non-existent-id not found'),
      )
      expect(repository.update).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('should delete a category when it exists', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockCategory)
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined)

      // Act
      const result = await service.remove('123e4567-e89b-12d3-a456-426614174000')

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000')
      expect(repository.delete).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000')
      expect(result).toEqual({
        message: 'Category with ID 123e4567-e89b-12d3-a456-426614174000 has been deleted',
      })
    })

    it('should throw NotFoundException when trying to delete non-existent category', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException('Category with ID non-existent-id not found'),
      )
      expect(repository.delete).not.toHaveBeenCalled()
    })
  })
})
