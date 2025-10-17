import { MinioConfigService } from '@config/minio/config.service'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import * as Minio from 'minio'
import { MinioService } from '../minio.service'
import {
  mockFileBuffer,
  mockFileList,
  mockFileMetadata,
  mockFileStream,
  mockPresignedUrl,
  mockUploadResult,
} from './minio.service.mock'

// Define mockMinioClient outside to make it available to the mock
const mockMinioClient = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  getObject: jest.fn(),
  statObject: jest.fn(),
  removeObject: jest.fn(),
  listObjects: jest.fn(),
  presignedGetObject: jest.fn(),
  copyObject: jest.fn(),
}

// Mock Minio.Client constructor to return our mockMinioClient
jest.mock('minio', () => {
  return {
    Client: jest.fn().mockImplementation(() => mockMinioClient),
    CopyConditions: jest.fn(),
  }
})

describe('MinioService', () => {
  let service: MinioService
  let minioConfig: MinioConfigService

  const mockMinioConfig = {
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
    defaultBucket: 'test-bucket',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: MinioConfigService,
          useValue: mockMinioConfig,
        },
      ],
    }).compile()

    service = module.get<MinioService>(MinioService)
    minioConfig = module.get<MinioConfigService>(MinioConfigService)

    // Mock the MinIO client
    ;(service as any).minioClient = mockMinioClient

    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('onModuleInit', () => {
    it('should initialize MinIO client and ensure default bucket exists', async () => {
      // Arrange
      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(true)

      // Act
      await service.onModuleInit()

      // Assert
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('test-bucket')
    })

    it('should create default bucket if it does not exist', async () => {
      // Arrange
      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(false)
      jest.spyOn(mockMinioClient, 'makeBucket').mockResolvedValue(undefined)

      // Act
      await service.onModuleInit()

      // Assert
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('test-bucket')
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('test-bucket')
    })
  })

  describe('ensureBucketExists', () => {
    it('should not create bucket when it already exists', async () => {
      // Arrange
      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(true)

      // Act
      await service.ensureBucketExists('existing-bucket')

      // Assert
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('existing-bucket')
      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled()
    })

    it('should create bucket when it does not exist', async () => {
      // Arrange
      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(false)
      jest.spyOn(mockMinioClient, 'makeBucket').mockResolvedValue(undefined)

      // Act
      await service.ensureBucketExists('new-bucket')

      // Assert
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('new-bucket')
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('new-bucket')
    })

    it('should throw error when bucket creation fails', async () => {
      // Arrange
      const error = new Error('Bucket creation failed')
      jest.spyOn(mockMinioClient, 'bucketExists').mockRejectedValue(error)

      // Act & Assert
      await expect(service.ensureBucketExists('error-bucket')).rejects.toThrow(error)
    })
  })

  describe('uploadFile', () => {
    it('should upload a Buffer successfully', async () => {
      // Arrange
      const file = Buffer.from('test-content')
      const fileName = 'test.txt'
      const metadata = { 'content-type': 'text/plain' }

      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(true)
      jest.spyOn(mockMinioClient, 'putObject').mockResolvedValue({ etag: 'abc123' })
      jest.spyOn(mockMinioClient, 'statObject').mockResolvedValue({ size: 1024 } as any)

      // Act
      const result = await service.uploadFile(file, fileName, 'test-bucket', metadata)

      // Assert
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        fileName,
        file,
        file.length,
        metadata,
      )
      expect(result).toEqual({
        fileName,
        etag: 'abc123',
        size: 1024,
        bucket: 'test-bucket',
      })
    })

    it('should upload a Stream successfully', async () => {
      // Arrange
      const file = mockFileStream()
      const fileName = 'test-stream.txt'

      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(true)
      jest.spyOn(mockMinioClient, 'putObject').mockResolvedValue({ etag: 'def456' })
      jest.spyOn(mockMinioClient, 'statObject').mockResolvedValue({ size: 2048 } as any)

      // Act
      const result = await service.uploadFile(file, fileName)

      // Assert
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        fileName,
        file,
        undefined,
        {},
      )
      expect(result.etag).toBe('def456')
      expect(result.size).toBe(2048)
    })

    it('should use default bucket when not specified', async () => {
      // Arrange
      const file = Buffer.from('test')
      const fileName = 'test.txt'

      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(true)
      jest.spyOn(mockMinioClient, 'putObject').mockResolvedValue({ etag: 'abc' })
      jest.spyOn(mockMinioClient, 'statObject').mockResolvedValue({ size: 4 } as any)

      // Act
      await service.uploadFile(file, fileName)

      // Assert
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        expect.any(String),
        expect.any(Buffer),
        expect.any(Number),
        expect.any(Object),
      )
    })

    it('should throw BadRequestException when upload fails', async () => {
      // Arrange
      const file = Buffer.from('test')
      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(true)
      jest.spyOn(mockMinioClient, 'putObject').mockRejectedValue(new Error('Upload failed'))

      // Act & Assert
      await expect(service.uploadFile(file, 'test.txt')).rejects.toThrow(BadRequestException)
      await expect(service.uploadFile(file, 'test.txt')).rejects.toThrow('Failed to upload file')
    })
  })

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      // Arrange
      const fileName = 'test.txt'
      const stream = mockFileStream()
      jest.spyOn(mockMinioClient, 'getObject').mockResolvedValue(stream as any)

      // Act
      const result = await service.downloadFile(fileName)

      // Assert
      expect(mockMinioClient.getObject).toHaveBeenCalledWith('test-bucket', fileName)
      expect(result).toBe(stream)
    })

    it('should use custom bucket when specified', async () => {
      // Arrange
      const fileName = 'test.txt'
      const bucketName = 'custom-bucket'
      const stream = mockFileStream()
      jest.spyOn(mockMinioClient, 'getObject').mockResolvedValue(stream as any)

      // Act
      await service.downloadFile(fileName, bucketName)

      // Assert
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(bucketName, fileName)
    })

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      jest.spyOn(mockMinioClient, 'getObject').mockRejectedValue(new Error('File not found'))

      // Act & Assert
      await expect(service.downloadFile('missing.txt')).rejects.toThrow(NotFoundException)
      await expect(service.downloadFile('missing.txt')).rejects.toThrow('File not found')
    })
  })

  describe('getFileBuffer', () => {
    it('should convert stream to buffer successfully', async () => {
      // Arrange
      const fileName = 'test.txt'
      const stream = mockFileStream()
      jest.spyOn(service, 'downloadFile').mockResolvedValue(stream)

      // Act
      const result = await service.getFileBuffer(fileName)

      // Assert
      expect(service.downloadFile).toHaveBeenCalledWith(fileName, 'test-bucket')
      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.toString()).toBe('mock-file-content')
    })

    it('should use custom bucket when specified', async () => {
      // Arrange
      const fileName = 'test.txt'
      const bucketName = 'custom-bucket'
      const stream = mockFileStream()
      jest.spyOn(service, 'downloadFile').mockResolvedValue(stream)

      // Act
      await service.getFileBuffer(fileName, bucketName)

      // Assert
      expect(service.downloadFile).toHaveBeenCalledWith(fileName, bucketName)
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      // Arrange
      const fileName = 'test.txt'
      jest.spyOn(mockMinioClient, 'removeObject').mockResolvedValue(undefined)

      // Act
      await service.deleteFile(fileName)

      // Assert
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('test-bucket', fileName)
    })

    it('should use custom bucket when specified', async () => {
      // Arrange
      const fileName = 'test.txt'
      const bucketName = 'custom-bucket'
      jest.spyOn(mockMinioClient, 'removeObject').mockResolvedValue(undefined)

      // Act
      await service.deleteFile(fileName, bucketName)

      // Assert
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(bucketName, fileName)
    })

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      jest.spyOn(mockMinioClient, 'removeObject').mockRejectedValue(new Error('Not found'))

      // Act & Assert
      await expect(service.deleteFile('missing.txt')).rejects.toThrow(NotFoundException)
    })
  })

  describe('listFiles', () => {
    it('should list all files in bucket', async () => {
      // Arrange
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            mockFileList.forEach((name) => callback({ name }))
          }
          if (event === 'end') {
            callback()
          }
          return mockStream
        }),
      }
      jest.spyOn(mockMinioClient, 'listObjects').mockReturnValue(mockStream as any)

      // Act
      const result = await service.listFiles()

      // Assert
      expect(mockMinioClient.listObjects).toHaveBeenCalledWith('test-bucket', undefined, true)
      expect(result).toEqual(mockFileList)
    })

    it('should list files with prefix', async () => {
      // Arrange
      const prefix = 'folder/'
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback({ name: 'folder/file3.txt' })
          }
          if (event === 'end') {
            callback()
          }
          return mockStream
        }),
      }
      jest.spyOn(mockMinioClient, 'listObjects').mockReturnValue(mockStream as any)

      // Act
      const result = await service.listFiles('test-bucket', prefix)

      // Assert
      expect(mockMinioClient.listObjects).toHaveBeenCalledWith('test-bucket', prefix, true)
      expect(result).toEqual(['folder/file3.txt'])
    })

    it('should handle stream errors', async () => {
      // Arrange
      const error = new Error('Stream error')
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(error)
          }
          return mockStream
        }),
      }
      jest.spyOn(mockMinioClient, 'listObjects').mockReturnValue(mockStream as any)

      // Act & Assert
      await expect(service.listFiles()).rejects.toThrow(error)
    })
  })

  describe('getFileMetadata', () => {
    it('should get file metadata successfully', async () => {
      // Arrange
      const fileName = 'test.txt'
      const statResult = {
        size: 1024,
        lastModified: new Date('2024-01-01'),
        etag: 'abc123',
        metaData: { 'content-type': 'text/plain' },
      }
      jest.spyOn(mockMinioClient, 'statObject').mockResolvedValue(statResult as any)

      // Act
      const result = await service.getFileMetadata(fileName)

      // Assert
      expect(mockMinioClient.statObject).toHaveBeenCalledWith('test-bucket', fileName)
      expect(result).toEqual({
        size: 1024,
        lastModified: new Date('2024-01-01'),
        etag: 'abc123',
        contentType: 'text/plain',
      })
    })

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      jest.spyOn(mockMinioClient, 'statObject').mockRejectedValue(new Error('Not found'))

      // Act & Assert
      await expect(service.getFileMetadata('missing.txt')).rejects.toThrow(NotFoundException)
    })
  })

  describe('getPresignedUrl', () => {
    it('should generate presigned URL with default expiry', async () => {
      // Arrange
      const fileName = 'test.txt'
      jest.spyOn(mockMinioClient, 'presignedGetObject').mockResolvedValue(mockPresignedUrl)

      // Act
      const result = await service.getPresignedUrl(fileName)

      // Assert
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith('test-bucket', fileName, 3600)
      expect(result).toBe(mockPresignedUrl)
    })

    it('should generate presigned URL with custom expiry', async () => {
      // Arrange
      const fileName = 'test.txt'
      const expirySeconds = 7200
      jest.spyOn(mockMinioClient, 'presignedGetObject').mockResolvedValue(mockPresignedUrl)

      // Act
      const result = await service.getPresignedUrl(fileName, expirySeconds)

      // Assert
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        fileName,
        expirySeconds,
      )
      expect(result).toBe(mockPresignedUrl)
    })

    it('should use custom bucket when specified', async () => {
      // Arrange
      const fileName = 'test.txt'
      const bucketName = 'custom-bucket'
      jest.spyOn(mockMinioClient, 'presignedGetObject').mockResolvedValue(mockPresignedUrl)

      // Act
      await service.getPresignedUrl(fileName, 3600, bucketName)

      // Assert
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(bucketName, fileName, 3600)
    })

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      jest.spyOn(mockMinioClient, 'presignedGetObject').mockRejectedValue(new Error('Not found'))

      // Act & Assert
      await expect(service.getPresignedUrl('missing.txt')).rejects.toThrow(NotFoundException)
    })
  })

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      // Arrange
      const fileName = 'test.txt'
      jest.spyOn(mockMinioClient, 'statObject').mockResolvedValue({} as any)

      // Act
      const result = await service.fileExists(fileName)

      // Assert
      expect(mockMinioClient.statObject).toHaveBeenCalledWith('test-bucket', fileName)
      expect(result).toBe(true)
    })

    it('should return false when file does not exist', async () => {
      // Arrange
      const fileName = 'missing.txt'
      jest.spyOn(mockMinioClient, 'statObject').mockRejectedValue(new Error('Not found'))

      // Act
      const result = await service.fileExists(fileName)

      // Assert
      expect(result).toBe(false)
    })

    it('should use custom bucket when specified', async () => {
      // Arrange
      const fileName = 'test.txt'
      const bucketName = 'custom-bucket'
      jest.spyOn(mockMinioClient, 'statObject').mockResolvedValue({} as any)

      // Act
      await service.fileExists(fileName, bucketName)

      // Assert
      expect(mockMinioClient.statObject).toHaveBeenCalledWith(bucketName, fileName)
    })
  })

  describe('copyFile', () => {
    it('should copy file within same bucket', async () => {
      // Arrange
      const sourceFileName = 'source.txt'
      const destFileName = 'dest.txt'
      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(true)
      jest.spyOn(mockMinioClient, 'copyObject').mockResolvedValue(undefined)

      // Act
      await service.copyFile(sourceFileName, destFileName)

      // Assert
      expect(mockMinioClient.copyObject).toHaveBeenCalledWith(
        'test-bucket',
        destFileName,
        '/test-bucket/source.txt',
        expect.any(Minio.CopyConditions),
      )
    })

    it('should copy file between different buckets', async () => {
      // Arrange
      const sourceFileName = 'source.txt'
      const destFileName = 'dest.txt'
      const sourceBucket = 'source-bucket'
      const destBucket = 'dest-bucket'

      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(true)
      jest.spyOn(mockMinioClient, 'copyObject').mockResolvedValue(undefined)

      // Act
      await service.copyFile(sourceFileName, destFileName, sourceBucket, destBucket)

      // Assert
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith(destBucket)
      expect(mockMinioClient.copyObject).toHaveBeenCalledWith(
        destBucket,
        destFileName,
        '/source-bucket/source.txt',
        expect.any(Minio.CopyConditions),
      )
    })

    it('should throw BadRequestException when copy fails', async () => {
      // Arrange
      jest.spyOn(mockMinioClient, 'bucketExists').mockResolvedValue(true)
      jest.spyOn(mockMinioClient, 'copyObject').mockRejectedValue(new Error('Copy failed'))

      // Act & Assert
      await expect(service.copyFile('source.txt', 'dest.txt')).rejects.toThrow(BadRequestException)
      await expect(service.copyFile('source.txt', 'dest.txt')).rejects.toThrow(
        'Failed to copy file',
      )
    })
  })

  describe('getClient', () => {
    it('should return MinIO client instance', () => {
      // Act
      const client = service.getClient()

      // Assert
      expect(client).toBe(mockMinioClient)
    })
  })
})
