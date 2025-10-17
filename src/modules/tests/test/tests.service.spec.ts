import { SchemaValidationService } from '@common/validation/schema-validation.service'
import { CategoriesService } from '@modules/categories/services/categories.service'
import { mockCategory } from '@modules/categories/test/categories.service.mock'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type { CreateTestDto } from '../dto/create-test.dto'
import type { UpdateTestDto } from '../dto/update-test.dto'
import { type ITestsRepository, TESTS_REPOSITORY } from '../interfaces/tests-repository.interface'
import { TestsService } from '../tests.service'
import { mockCompletedTest, mockTest, mockTests } from './tests.service.mock'

describe('TestsService', () => {
  let service: TestsService
  let repository: ITestsRepository
  let categoriesService: CategoriesService
  let schemaValidationService: SchemaValidationService

  const mockRepository: ITestsRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCategory: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }

  const mockCategoriesService = {
    findOne: jest.fn(),
  }

  const mockSchemaValidationService = {
    validateCommonData: jest.fn(),
    validateCustomData: jest.fn(),
    validateOrThrow: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestsService,
        {
          provide: TESTS_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
        {
          provide: SchemaValidationService,
          useValue: mockSchemaValidationService,
        },
      ],
    }).compile()

    service = module.get<TestsService>(TestsService)
    repository = module.get<ITestsRepository>(TESTS_REPOSITORY)
    categoriesService = module.get<CategoriesService>(CategoriesService)
    schemaValidationService = module.get<SchemaValidationService>(SchemaValidationService)

    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    const createTestDto: CreateTestDto = {
      categoryId: 'cat-123',
      name: 'New Test',
      description: 'Test description',
      status: 'draft',
      commonData: { temperature: 25 },
      customData: { notes: 'Test notes' },
      metadata: {},
    }

    it('should create a test successfully', async () => {
      // Arrange
      const userId = 'user-123'
      const validationResult = { valid: true, errors: [] }

      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(schemaValidationService, 'validateCommonData').mockReturnValue(validationResult)
      jest.spyOn(schemaValidationService, 'validateCustomData').mockReturnValue(validationResult)
      jest.spyOn(schemaValidationService, 'validateOrThrow').mockImplementation()
      jest.spyOn(repository, 'create').mockResolvedValue(mockTest)

      // Act
      const result = await service.create(createTestDto, userId)

      // Assert
      expect(categoriesService.findOne).toHaveBeenCalledWith(createTestDto.categoryId)
      expect(schemaValidationService.validateCommonData).toHaveBeenCalledWith(
        createTestDto.commonData,
        mockCategory.baseSchema,
      )
      expect(schemaValidationService.validateCustomData).toHaveBeenCalledWith(
        createTestDto.customData,
        mockCategory.customFieldsSchema,
      )
      expect(repository.create).toHaveBeenCalledWith({
        categoryId: createTestDto.categoryId,
        name: createTestDto.name,
        description: createTestDto.description,
        status: 'draft',
        commonData: createTestDto.commonData,
        customData: createTestDto.customData,
        metadata: {},
        createdBy: userId,
        updatedBy: userId,
      })
      expect(result).toEqual(mockTest)
    })

    it('should use default status "draft" when not provided', async () => {
      // Arrange
      const dtoWithoutStatus: CreateTestDto = { ...createTestDto, status: undefined }
      const validationResult = { valid: true, errors: [] }

      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(schemaValidationService, 'validateCommonData').mockReturnValue(validationResult)
      jest.spyOn(schemaValidationService, 'validateCustomData').mockReturnValue(validationResult)
      jest.spyOn(repository, 'create').mockResolvedValue(mockTest)

      // Act
      await service.create(dtoWithoutStatus, 'user-123')

      // Assert
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }))
    })

    it('should use empty object for customData when not provided', async () => {
      // Arrange
      const dtoWithoutCustomData: CreateTestDto = { ...createTestDto, customData: undefined }
      const validationResult = { valid: true, errors: [] }

      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(schemaValidationService, 'validateCommonData').mockReturnValue(validationResult)
      jest.spyOn(schemaValidationService, 'validateCustomData').mockReturnValue(validationResult)
      jest.spyOn(repository, 'create').mockResolvedValue(mockTest)

      // Act
      await service.create(dtoWithoutCustomData, 'user-123')

      // Assert
      expect(schemaValidationService.validateCustomData).toHaveBeenCalledWith(
        {},
        mockCategory.customFieldsSchema,
      )
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ customData: {} }))
    })

    it('should throw NotFoundException when category does not exist', async () => {
      // Arrange
      jest
        .spyOn(categoriesService, 'findOne')
        .mockRejectedValue(new NotFoundException('Category not found'))

      // Act & Assert
      await expect(service.create(createTestDto, 'user-123')).rejects.toThrow(NotFoundException)
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException when commonData validation fails', async () => {
      // Arrange
      const validationResult = { valid: true, errors: [] }

      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(schemaValidationService, 'validateCommonData').mockReturnValue(validationResult)
      jest
        .spyOn(schemaValidationService, 'validateOrThrow')
        .mockImplementation((result, context) => {
          if (context === 'commonData') {
            throw new BadRequestException('commonData validation failed')
          }
        })

      // Act & Assert
      await expect(service.create(createTestDto, 'user-123')).rejects.toThrow(BadRequestException)
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException when customData validation fails', async () => {
      // Arrange
      const validationResult = { valid: true, errors: [] }

      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(schemaValidationService, 'validateCommonData').mockReturnValue(validationResult)
      jest.spyOn(schemaValidationService, 'validateCustomData').mockReturnValue(validationResult)
      jest
        .spyOn(schemaValidationService, 'validateOrThrow')
        .mockImplementation((result, context) => {
          if (context === 'customData') {
            throw new BadRequestException('customData validation failed')
          }
        })

      // Act & Assert
      await expect(service.create(createTestDto, 'user-123')).rejects.toThrow(BadRequestException)
      expect(repository.create).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('should return an array of tests', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue(mockTests)

      // Act
      const result = await service.findAll()

      // Assert
      expect(repository.findAll).toHaveBeenCalled()
      expect(result).toEqual(mockTests)
      expect(result).toHaveLength(3)
    })

    it('should return an empty array when no tests exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue([])

      // Act
      const result = await service.findAll()

      // Assert
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })
  })

  describe('findOne', () => {
    it('should return a test when found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTest)

      // Act
      const result = await service.findOne(mockTest.id)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockTest.id)
      expect(result).toEqual(mockTest)
    })

    it('should throw NotFoundException when test not found', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id'
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.findOne(nonExistentId)).rejects.toThrow(NotFoundException)
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        `Test with ID ${nonExistentId} not found`,
      )
    })
  })

  describe('findByCategory', () => {
    it('should return tests for a specific category', async () => {
      // Arrange
      const categoryId = 'cat-123'
      const categoryTests = [mockTest, mockCompletedTest]

      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(repository, 'findByCategory').mockResolvedValue(categoryTests)

      // Act
      const result = await service.findByCategory(categoryId)

      // Assert
      expect(categoriesService.findOne).toHaveBeenCalledWith(categoryId)
      expect(repository.findByCategory).toHaveBeenCalledWith(categoryId)
      expect(result).toEqual(categoryTests)
    })

    it('should throw NotFoundException when category does not exist', async () => {
      // Arrange
      jest
        .spyOn(categoriesService, 'findOne')
        .mockRejectedValue(new NotFoundException('Category not found'))

      // Act & Assert
      await expect(service.findByCategory('non-existent-cat')).rejects.toThrow(NotFoundException)
      expect(repository.findByCategory).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    const updateTestDto: UpdateTestDto = {
      name: 'Updated Test Name',
      description: 'Updated description',
    }

    it('should update a test successfully', async () => {
      // Arrange
      const userId = 'user-456'
      const updatedTest = { ...mockTest, ...updateTestDto, updatedBy: userId }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTest)
      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(repository, 'update').mockResolvedValue(updatedTest)

      // Act
      const result = await service.update(mockTest.id, updateTestDto, userId)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockTest.id)
      expect(categoriesService.findOne).toHaveBeenCalledWith(mockTest.categoryId)
      expect(repository.update).toHaveBeenCalledWith(mockTest.id, {
        ...updateTestDto,
        updatedBy: userId,
      })
      expect(result).toEqual(updatedTest)
    })

    it('should throw NotFoundException when test does not exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.update('non-existent-id', updateTestDto, 'user-123')).rejects.toThrow(
        NotFoundException,
      )
      expect(repository.update).not.toHaveBeenCalled()
    })

    it('should validate commonData when provided', async () => {
      // Arrange
      const dtoWithCommonData: UpdateTestDto = {
        ...updateTestDto,
        commonData: { temperature: 30 },
      }
      const validationResult = { valid: true, errors: [] }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTest)
      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(schemaValidationService, 'validateCommonData').mockReturnValue(validationResult)
      jest.spyOn(schemaValidationService, 'validateOrThrow').mockImplementation()
      jest.spyOn(repository, 'update').mockResolvedValue(mockTest)

      // Act
      await service.update(mockTest.id, dtoWithCommonData, 'user-123')

      // Assert
      expect(schemaValidationService.validateCommonData).toHaveBeenCalledWith(
        dtoWithCommonData.commonData,
        mockCategory.baseSchema,
      )
      expect(schemaValidationService.validateOrThrow).toHaveBeenCalled()
    })

    it('should validate customData when provided', async () => {
      // Arrange
      const dtoWithCustomData: UpdateTestDto = {
        ...updateTestDto,
        customData: { newField: 'value' },
      }
      const validationResult = { valid: true, errors: [] }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTest)
      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(schemaValidationService, 'validateCustomData').mockReturnValue(validationResult)
      jest.spyOn(schemaValidationService, 'validateOrThrow').mockImplementation()
      jest.spyOn(repository, 'update').mockResolvedValue(mockTest)

      // Act
      await service.update(mockTest.id, dtoWithCustomData, 'user-123')

      // Assert
      expect(schemaValidationService.validateCustomData).toHaveBeenCalledWith(
        dtoWithCustomData.customData,
        mockCategory.customFieldsSchema,
      )
      expect(schemaValidationService.validateOrThrow).toHaveBeenCalled()
    })

    it('should use new category schema when categoryId is changed', async () => {
      // Arrange
      const newCategoryId = 'cat-456'
      const dtoWithNewCategory: UpdateTestDto = {
        ...updateTestDto,
        categoryId: newCategoryId,
      }
      const newCategory = { ...mockCategory, id: newCategoryId }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTest)
      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(newCategory)
      jest.spyOn(repository, 'update').mockResolvedValue(mockTest)

      // Act
      await service.update(mockTest.id, dtoWithNewCategory, 'user-123')

      // Assert
      expect(categoriesService.findOne).toHaveBeenCalledWith(newCategoryId)
    })

    it('should set completedAt when status is changed to completed', async () => {
      // Arrange
      const dtoWithCompletedStatus: UpdateTestDto = {
        status: 'completed',
      }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTest)
      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(mockCategory)
      jest.spyOn(repository, 'update').mockResolvedValue(mockCompletedTest)

      // Act
      await service.update(mockTest.id, dtoWithCompletedStatus, 'user-123')

      // Assert
      expect(repository.update).toHaveBeenCalledWith(
        mockTest.id,
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      )
    })
  })

  describe('remove', () => {
    it('should delete a test successfully', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTest)
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined)

      // Act
      const result = await service.remove(mockTest.id)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockTest.id)
      expect(repository.delete).toHaveBeenCalledWith(mockTest.id)
      expect(result).toEqual({ message: `Test with ID ${mockTest.id} has been deleted` })
    })

    it('should throw NotFoundException when test to delete does not exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException)
      expect(repository.delete).not.toHaveBeenCalled()
    })
  })
})
