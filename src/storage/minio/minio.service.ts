import type { MinioConfigService } from '@config/minio/config.service'
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common'
import * as Minio from 'minio'
import type { Readable } from 'stream'

export interface UploadResult {
  fileName: string
  etag: string
  size: number
  bucket: string
}

export interface FileMetadata {
  size: number
  lastModified: Date
  etag: string
  contentType?: string
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name)
  private minioClient!: Minio.Client

  constructor(private readonly minioConfig: MinioConfigService) {}

  async onModuleInit() {
    this.minioClient = new Minio.Client({
      endPoint: this.minioConfig.endPoint,
      port: this.minioConfig.port,
      useSSL: this.minioConfig.useSSL,
      accessKey: this.minioConfig.accessKey,
      secretKey: this.minioConfig.secretKey,
    })

    await this.ensureBucketExists(this.minioConfig.defaultBucket)
    this.logger.log('MinIO client initialized successfully')
  }

  async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucketName)
      if (!exists) {
        await this.minioClient.makeBucket(bucketName)
        this.logger.log(`Bucket "${bucketName}" created`)
      }
    } catch (error) {
      this.logger.error(`Error ensuring bucket exists: ${error}`)
      throw error
    }
  }

  async uploadFile(
    file: Buffer | Readable,
    fileName: string,
    bucketName: string = this.minioConfig.defaultBucket,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    try {
      await this.ensureBucketExists(bucketName)

      const metaData = metadata || {}

      let etag: string

      if (Buffer.isBuffer(file)) {
        const result = await this.minioClient.putObject(
          bucketName,
          fileName,
          file,
          file.length,
          metaData,
        )
        etag = result.etag
      } else {
        const result = await this.minioClient.putObject(
          bucketName,
          fileName,
          file,
          undefined,
          metaData,
        )
        etag = result.etag
      }

      const stat = await this.minioClient.statObject(bucketName, fileName)

      return {
        fileName,
        etag,
        size: stat.size,
        bucket: bucketName,
      }
    } catch (error) {
      this.logger.error(`Error uploading file: ${error}`)
      throw new BadRequestException('Failed to upload file')
    }
  }

  async downloadFile(
    fileName: string,
    bucketName: string = this.minioConfig.defaultBucket,
  ): Promise<Readable> {
    try {
      const stream = await this.minioClient.getObject(bucketName, fileName)
      return stream
    } catch (error) {
      this.logger.error(`Error downloading file: ${error}`)
      throw new NotFoundException('File not found')
    }
  }

  async getFileBuffer(
    fileName: string,
    bucketName: string = this.minioConfig.defaultBucket,
  ): Promise<Buffer> {
    const stream = await this.downloadFile(fileName, bucketName)

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }

  async deleteFile(
    fileName: string,
    bucketName: string = this.minioConfig.defaultBucket,
  ): Promise<void> {
    try {
      await this.minioClient.removeObject(bucketName, fileName)
      this.logger.log(`File "${fileName}" deleted from bucket "${bucketName}"`)
    } catch (error) {
      this.logger.error(`Error deleting file: ${error}`)
      throw new NotFoundException('File not found')
    }
  }

  async listFiles(
    bucketName: string = this.minioConfig.defaultBucket,
    prefix?: string,
  ): Promise<string[]> {
    try {
      const stream = this.minioClient.listObjects(bucketName, prefix, true)
      const files: string[] = []

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (obj.name) {
            files.push(obj.name)
          }
        })
        stream.on('error', reject)
        stream.on('end', () => resolve(files))
      })
    } catch (error) {
      this.logger.error(`Error listing files: ${error}`)
      throw error
    }
  }

  async getFileMetadata(
    fileName: string,
    bucketName: string = this.minioConfig.defaultBucket,
  ): Promise<FileMetadata> {
    try {
      const stat = await this.minioClient.statObject(bucketName, fileName)

      return {
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        contentType: stat.metaData?.['content-type'],
      }
    } catch (error) {
      this.logger.error(`Error getting file metadata: ${error}`)
      throw new NotFoundException('File not found')
    }
  }

  async getPresignedUrl(
    fileName: string,
    expirySeconds: number = 3600,
    bucketName: string = this.minioConfig.defaultBucket,
  ): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(bucketName, fileName, expirySeconds)
    } catch (error) {
      this.logger.error(`Error generating presigned URL: ${error}`)
      throw new NotFoundException('File not found')
    }
  }

  async fileExists(
    fileName: string,
    bucketName: string = this.minioConfig.defaultBucket,
  ): Promise<boolean> {
    try {
      await this.minioClient.statObject(bucketName, fileName)
      return true
    } catch (error) {
      return false
    }
  }

  async copyFile(
    sourceFileName: string,
    destFileName: string,
    sourceBucket: string = this.minioConfig.defaultBucket,
    destBucket: string = this.minioConfig.defaultBucket,
  ): Promise<void> {
    try {
      await this.ensureBucketExists(destBucket)

      const conds = new Minio.CopyConditions()
      await this.minioClient.copyObject(
        destBucket,
        destFileName,
        `/${sourceBucket}/${sourceFileName}`,
        conds,
      )

      this.logger.log(
        `File copied from ${sourceBucket}/${sourceFileName} to ${destBucket}/${destFileName}`,
      )
    } catch (error) {
      this.logger.error(`Error copying file: ${error}`)
      throw new BadRequestException('Failed to copy file')
    }
  }

  getClient(): Minio.Client {
    return this.minioClient
  }
}
