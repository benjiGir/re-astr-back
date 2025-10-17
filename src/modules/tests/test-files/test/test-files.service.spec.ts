import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { Readable } from 'stream'
import { MinioService } from '@/storage/minio/minio.service'
import { mockTest } from '../../test/tests.service.mock'
import { TestsService } from '../../tests.service'
import type { CreateTestFileDto } from '../dto/create-test-file.dto'
import type { UpdateTestFileDto } from '../dto/update-test-file.dto'
import type { UploadTestFileDto } from '../dto/upload-test-file.dto'
import {
  type ITestFilesRepository,
  TEST_FILES_REPOSITORY,
} from '../interfaces/test-files-repository.interface'
import { TestFilesService } from '../test-files.service'
import { mockReportFile, mockTestFile, mockTestFiles } from './test-files.service.mock'

describe('TestFilesService', () => {
  let service: TestFilesService
  let repository: ITestFilesRepository
  let testsService: TestsService
  let minioService: MinioService

  const mockRepository: ITestFilesRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByTest: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }

  const mockTestsService = {
    findOne: jest.fn(),
  }

  const mockMinioService = {
    uploadFile: jest.fn(),
    downloadFile: jest.fn(),
    getPresignedUrl: jest.fn(),
    deleteFile: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestFilesService,
        {
          provide: TEST_FILES_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: TestsService,
          useValue: mockTestsService,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
      ],
    }).compile()

    service = module.get<TestFilesService>(TestFilesService)
    repository = module.get<ITestFilesRepository>(TEST_FILES_REPOSITORY)
    testsService = module.get<TestsService>(TestsService)
    minioService = module.get<MinioService>(MinioService)

    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    const createDto: CreateTestFileDto = {
      testId: 'test-123',
      fileType: 'screenshot',
      originalFilename: 'test.png',
      storedFilename: '123-test.png',
      bucketName: 'test-archives',
      objectKey: 'tests/2024/01/123-test.png',
      fileSize: 1024,
      mimeType: 'image/png',
      checksum: 'abc123',
      metadata: {},
    }

    it('should create a test file metadata successfully', async () => {
      // Arrange
      const userId = 'user-123'

      jest.spyOn(testsService, 'findOne').mockResolvedValue(mockTest)
      jest.spyOn(repository, 'create').mockResolvedValue(mockTestFile)

      // Act
      const result = await service.create(createDto, userId)

      // Assert
      expect(testsService.findOne).toHaveBeenCalledWith(createDto.testId)
      expect(repository.create).toHaveBeenCalledWith({
        testId: createDto.testId,
        fileType: createDto.fileType,
        originalFilename: createDto.originalFilename,
        storedFilename: createDto.storedFilename,
        bucketName: 'test-archives',
        objectKey: createDto.objectKey,
        fileSize: createDto.fileSize,
        mimeType: createDto.mimeType,
        checksum: createDto.checksum,
        metadata: {},
        uploadedBy: userId,
        expiresAt: undefined,
      })
      expect(result).toEqual(mockTestFile)
    })

    it('should use default bucket name when not provided', async () => {
      // Arrange
      const dtoWithoutBucket: CreateTestFileDto = { ...createDto, bucketName: undefined }

      jest.spyOn(testsService, 'findOne').mockResolvedValue(mockTest)
      jest.spyOn(repository, 'create').mockResolvedValue(mockTestFile)

      // Act
      await service.create(dtoWithoutBucket, 'user-123')

      // Assert
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ bucketName: 'test-archives' }),
      )
    })

    it('should handle expiresAt date when provided', async () => {
      // Arrange
      const expiresAt = '2024-12-31T23:59:59Z'
      const dtoWithExpiry: CreateTestFileDto = { ...createDto, expiresAt }

      jest.spyOn(testsService, 'findOne').mockResolvedValue(mockTest)
      jest.spyOn(repository, 'create').mockResolvedValue(mockTestFile)

      // Act
      await service.create(dtoWithExpiry, 'user-123')

      // Assert
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: new Date(expiresAt) }),
      )
    })

    it('should throw NotFoundException when test does not exist', async () => {
      // Arrange
      jest.spyOn(testsService, 'findOne').mockRejectedValue(new NotFoundException('Test not found'))

      // Act & Assert
      await expect(service.create(createDto, 'user-123')).rejects.toThrow(NotFoundException)
      expect(repository.create).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('should return an array of test files', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue(mockTestFiles)

      // Act
      const result = await service.findAll()

      // Assert
      expect(repository.findAll).toHaveBeenCalled()
      expect(result).toEqual(mockTestFiles)
      expect(result).toHaveLength(3)
    })

    it('should return an empty array when no files exist', async () => {
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
    it('should return a test file when found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)

      // Act
      const result = await service.findOne(mockTestFile.id)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockTestFile.id)
      expect(result).toEqual(mockTestFile)
    })

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id'
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.findOne(nonExistentId)).rejects.toThrow(NotFoundException)
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        `Test file with ID ${nonExistentId} not found`,
      )
    })
  })

  describe('findByTest', () => {
    it('should return files for a specific test', async () => {
      // Arrange
      const testId = 'test-123'
      const testFiles = [mockTestFile, mockReportFile]

      jest.spyOn(testsService, 'findOne').mockResolvedValue(mockTest)
      jest.spyOn(repository, 'findByTest').mockResolvedValue(testFiles)

      // Act
      const result = await service.findByTest(testId)

      // Assert
      expect(testsService.findOne).toHaveBeenCalledWith(testId)
      expect(repository.findByTest).toHaveBeenCalledWith(testId)
      expect(result).toEqual(testFiles)
    })

    it('should throw NotFoundException when test does not exist', async () => {
      // Arrange
      jest.spyOn(testsService, 'findOne').mockRejectedValue(new NotFoundException('Test not found'))

      // Act & Assert
      await expect(service.findByTest('non-existent-test')).rejects.toThrow(NotFoundException)
      expect(repository.findByTest).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    const updateDto: UpdateTestFileDto = {
      fileType: 'report',
      metadata: { updated: true },
    }

    it('should update a test file metadata successfully', async () => {
      // Arrange
      const updatedFile = {
        ...mockTestFile,
        fileType: 'report' as const,
        metadata: { updated: true },
      }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)
      jest.spyOn(repository, 'update').mockResolvedValue(updatedFile)

      // Act
      const result = await service.update(mockTestFile.id, updateDto)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockTestFile.id)
      expect(repository.update).toHaveBeenCalledWith(mockTestFile.id, updateDto)
      expect(result).toEqual(updatedFile)
    })

    it('should throw NotFoundException when file does not exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException)
      expect(repository.update).not.toHaveBeenCalled()
    })

    it('should verify new test exists when testId is changed', async () => {
      // Arrange
      const dtoWithNewTest: UpdateTestFileDto = {
        ...updateDto,
        testId: 'new-test-id',
      }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)
      jest.spyOn(testsService, 'findOne').mockResolvedValue(mockTest)
      jest.spyOn(repository, 'update').mockResolvedValue(mockTestFile)

      // Act
      await service.update(mockTestFile.id, dtoWithNewTest)

      // Assert
      expect(testsService.findOne).toHaveBeenCalledWith('new-test-id')
    })

    it('should handle expiresAt date when provided', async () => {
      // Arrange
      const expiresAt = '2024-12-31T23:59:59Z'
      const dtoWithExpiry: UpdateTestFileDto = { ...updateDto, expiresAt }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)
      jest.spyOn(repository, 'update').mockResolvedValue(mockTestFile)

      // Act
      await service.update(mockTestFile.id, dtoWithExpiry)

      // Assert
      expect(repository.update).toHaveBeenCalledWith(
        mockTestFile.id,
        expect.objectContaining({ expiresAt: new Date(expiresAt) }),
      )
    })
  })

  describe('uploadFile', () => {
    const uploadDto: UploadTestFileDto = {
      testId: 'test-123',
      fileType: 'screenshot',
      metadata: {},
    }

    const mockMultipartFile = {
      filename: 'test-screenshot.png',
      mimetype: 'image/png',
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-file-content')),
    } as any

    it('should upload file and create metadata successfully', async () => {
      // Arrange
      const userId = 'user-123'
      const uploadResult = {
        fileName: 'test-screenshot.png',
        size: 1024,
        etag: 'abc123',
        bucket: 'test-archives',
      }

      jest.spyOn(testsService, 'findOne').mockResolvedValue(mockTest)
      jest.spyOn(minioService, 'uploadFile').mockResolvedValue(uploadResult)
      jest.spyOn(repository, 'create').mockResolvedValue(mockTestFile)

      // Act
      const result = await service.uploadFile(mockMultipartFile, uploadDto, userId)

      // Assert
      expect(testsService.findOne).toHaveBeenCalledWith(uploadDto.testId)
      expect(mockMultipartFile.toBuffer).toHaveBeenCalled()
      expect(minioService.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('tests/'),
        'test-archives',
        expect.objectContaining({
          'content-type': 'image/png',
          'original-filename': 'test-screenshot.png',
        }),
      )
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          testId: uploadDto.testId,
          fileType: uploadDto.fileType,
          originalFilename: 'test-screenshot.png',
          mimeType: 'image/png',
          fileSize: 1024,
          uploadedBy: userId,
        }),
      )
      expect(result).toEqual(mockTestFile)
    })

    it('should throw BadRequestException when no file provided', async () => {
      // Arrange
      jest.spyOn(testsService, 'findOne').mockResolvedValue(mockTest)

      // Act & Assert
      await expect(service.uploadFile(null as any, uploadDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      )
      await expect(service.uploadFile(null as any, uploadDto, 'user-123')).rejects.toThrow(
        'No file provided',
      )
    })

    it('should throw BadRequestException when upload fails', async () => {
      // Arrange
      jest.spyOn(testsService, 'findOne').mockResolvedValue(mockTest)
      jest.spyOn(minioService, 'uploadFile').mockRejectedValue(new Error('Upload failed'))

      // Act & Assert
      await expect(service.uploadFile(mockMultipartFile, uploadDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      )
      await expect(service.uploadFile(mockMultipartFile, uploadDto, 'user-123')).rejects.toThrow(
        'Failed to upload file',
      )
    })
  })

  describe('downloadFile', () => {
    it('should download file from MinIO successfully', async () => {
      // Arrange
      const mockStream = new Readable()
      mockStream.push('file-content')
      mockStream.push(null)

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)
      jest.spyOn(minioService, 'downloadFile').mockResolvedValue(mockStream)

      // Act
      const result = await service.downloadFile(mockTestFile.id)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockTestFile.id)
      expect(minioService.downloadFile).toHaveBeenCalledWith(
        mockTestFile.objectKey,
        mockTestFile.bucketName,
      )
      expect(result.stream).toBe(mockStream)
      expect(result.metadata).toEqual({
        filename: mockTestFile.originalFilename,
        mimeType: mockTestFile.mimeType,
        size: mockTestFile.fileSize,
      })
    })

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.downloadFile('non-existent-id')).rejects.toThrow(NotFoundException)
      expect(minioService.downloadFile).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException when file not found in storage', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)
      jest.spyOn(minioService, 'downloadFile').mockRejectedValue(new Error('File not in storage'))

      // Act & Assert
      await expect(service.downloadFile(mockTestFile.id)).rejects.toThrow(NotFoundException)
      await expect(service.downloadFile(mockTestFile.id)).rejects.toThrow(
        'File not found in storage',
      )
    })
  })

  describe('getPresignedUrl', () => {
    it('should generate presigned URL with default expiry', async () => {
      // Arrange
      const presignedUrl =
        'https://minio.example.com/test-archives/tests/2024/01/file.png?expires=3600'

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)
      jest.spyOn(minioService, 'getPresignedUrl').mockResolvedValue(presignedUrl)

      // Act
      const result = await service.getPresignedUrl(mockTestFile.id)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockTestFile.id)
      expect(minioService.getPresignedUrl).toHaveBeenCalledWith(
        mockTestFile.objectKey,
        3600,
        mockTestFile.bucketName,
      )
      expect(result).toBe(presignedUrl)
    })

    it('should generate presigned URL with custom expiry', async () => {
      // Arrange
      const customExpiry = 7200
      const presignedUrl = 'https://minio.example.com/file?expires=7200'

      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)
      jest.spyOn(minioService, 'getPresignedUrl').mockResolvedValue(presignedUrl)

      // Act
      const result = await service.getPresignedUrl(mockTestFile.id, customExpiry)

      // Assert
      expect(minioService.getPresignedUrl).toHaveBeenCalledWith(
        mockTestFile.objectKey,
        customExpiry,
        mockTestFile.bucketName,
      )
      expect(result).toBe(presignedUrl)
    })

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.getPresignedUrl('non-existent-id')).rejects.toThrow(NotFoundException)
      expect(minioService.getPresignedUrl).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('should delete file from MinIO and database successfully', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)
      jest.spyOn(minioService, 'deleteFile').mockResolvedValue(undefined)
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined)

      // Act
      const result = await service.remove(mockTestFile.id)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockTestFile.id)
      expect(minioService.deleteFile).toHaveBeenCalledWith(
        mockTestFile.objectKey,
        mockTestFile.bucketName,
      )
      expect(repository.delete).toHaveBeenCalledWith(mockTestFile.id)
      expect(result).toEqual({ message: `Test file with ID ${mockTestFile.id} has been deleted` })
    })

    it('should delete from database even if MinIO deletion fails', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTestFile)
      jest.spyOn(minioService, 'deleteFile').mockRejectedValue(new Error('MinIO error'))
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined)

      // Act
      const result = await service.remove(mockTestFile.id)

      // Assert
      expect(minioService.deleteFile).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete file from MinIO'),
      )
      expect(repository.delete).toHaveBeenCalledWith(mockTestFile.id)
      expect(result).toEqual({ message: `Test file with ID ${mockTestFile.id} has been deleted` })

      consoleErrorSpy.mockRestore()
    })

    it('should throw NotFoundException when file does not exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException)
      expect(minioService.deleteFile).not.toHaveBeenCalled()
      expect(repository.delete).not.toHaveBeenCalled()
    })
  })
})
