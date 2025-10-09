import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTestFileDto } from './dto/create-test-file.dto';
import { UpdateTestFileDto } from './dto/update-test-file.dto';
import { UploadTestFileDto } from './dto/upload-test-file.dto';
import { TEST_FILES_REPOSITORY, type ITestFilesRepository } from './interfaces/test-files-repository.interface';
import { TestsService } from '../tests.service';
import { MinioService } from '@/storage/minio/minio.service';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import type { MultipartFile } from '@fastify/multipart';

@Injectable()
export class TestFilesService {
  constructor(
    @Inject(TEST_FILES_REPOSITORY)
    private readonly testFilesRepository: ITestFilesRepository,
    private readonly testsService: TestsService,
    private readonly minioService: MinioService,
  ) {}

  async create(createTestFileDto: CreateTestFileDto, userId: string) {
    await this.testsService.findOne(createTestFileDto.testId);

    return this.testFilesRepository.create({
      testId: createTestFileDto.testId,
      fileType: createTestFileDto.fileType,
      originalFilename: createTestFileDto.originalFilename,
      storedFilename: createTestFileDto.storedFilename,
      bucketName: createTestFileDto.bucketName || 'test-archives',
      objectKey: createTestFileDto.objectKey,
      fileSize: createTestFileDto.fileSize,
      mimeType: createTestFileDto.mimeType,
      checksum: createTestFileDto.checksum,
      metadata: createTestFileDto.metadata || {},
      uploadedBy: userId,
      expiresAt: createTestFileDto.expiresAt ? new Date(createTestFileDto.expiresAt) : undefined,
    });
  }

  async findAll() {
    return this.testFilesRepository.findAll();
  }

  async findOne(id: string) {
    const testFile = await this.testFilesRepository.findById(id);

    if (!testFile) {
      throw new NotFoundException(`Test file with ID ${id} not found`);
    }

    return testFile;
  }

  async findByTest(testId: string) {
    await this.testsService.findOne(testId);

    return this.testFilesRepository.findByTest(testId);
  }

  async update(id: string, updateTestFileDto: UpdateTestFileDto) {
    await this.findOne(id);

    if (updateTestFileDto.testId) {
      await this.testsService.findOne(updateTestFileDto.testId);
    }

    const updateData: any = { ...updateTestFileDto };

    if (updateTestFileDto.expiresAt) {
      updateData.expiresAt = new Date(updateTestFileDto.expiresAt);
    }

    return this.testFilesRepository.update(id, updateData);
  }

  async uploadFile(file: MultipartFile, uploadDto: UploadTestFileDto, userId: string) {
    await this.testsService.findOne(uploadDto.testId);

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      const fileBuffer = await file.toBuffer();
      const checksum = createHash('sha256').update(fileBuffer).digest('hex');

      const timestamp = Date.now();
      const fileExtension = file.filename.split('.').pop();
      const storedFilename = `${timestamp}-${checksum.substring(0, 8)}.${fileExtension}`;

      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const objectKey = `tests/${year}/${month}/${storedFilename}`;

      const bucketName = 'test-archives';

      const uploadResult = await this.minioService.uploadFile(
        fileBuffer,
        objectKey,
        bucketName,
        {
          'content-type': file.mimetype,
          'original-filename': file.filename,
        },
      );

      const testFile = await this.testFilesRepository.create({
        testId: uploadDto.testId,
        fileType: uploadDto.fileType,
        originalFilename: file.filename,
        storedFilename,
        bucketName,
        objectKey,
        fileSize: uploadResult.size,
        mimeType: file.mimetype,
        checksum,
        metadata: uploadDto.metadata || {},
        uploadedBy: userId,
        expiresAt: uploadDto.expiresAt ? new Date(uploadDto.expiresAt) : undefined,
      });

      return testFile;
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error}`);
    }
  }

  async downloadFile(id: string): Promise<{ stream: Readable; metadata: any }> {
    const testFile = await this.findOne(id);

    try {
      const stream = await this.minioService.downloadFile(
        testFile.objectKey,
        testFile.bucketName,
      );

      return {
        stream,
        metadata: {
          filename: testFile.originalFilename,
          mimeType: testFile.mimeType,
          size: testFile.fileSize,
        },
      };
    } catch (error) {
      throw new NotFoundException(`File not found in storage: ${error}`);
    }
  }

  async getPresignedUrl(id: string, expirySeconds: number = 3600): Promise<string> {
    const testFile = await this.findOne(id);

    return this.minioService.getPresignedUrl(
      testFile.objectKey,
      expirySeconds,
      testFile.bucketName,
    );
  }

  async remove(id: string) {
    const testFile = await this.findOne(id);

    try {
      await this.minioService.deleteFile(testFile.objectKey, testFile.bucketName);
    } catch (error) {
      console.error(`Failed to delete file from MinIO: ${error}`);
    }

    await this.testFilesRepository.delete(id);

    return { message: `Test file with ID ${id} has been deleted` };
  }
}