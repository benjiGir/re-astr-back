import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTestFileDto } from './dto/create-test-file.dto';
import { UpdateTestFileDto } from './dto/update-test-file.dto';
import { TEST_FILES_REPOSITORY, type ITestFilesRepository } from './interfaces/test-files-repository.interface';
import { TestsService } from '../tests.service';

@Injectable()
export class TestFilesService {
  constructor(
    @Inject(TEST_FILES_REPOSITORY)
    private readonly testFilesRepository: ITestFilesRepository,
    private readonly testsService: TestsService,
  ) {}

  async create(createTestFileDto: CreateTestFileDto, userId: string) {
    // Verify test exists
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
    // Verify test exists
    await this.testsService.findOne(testId);

    return this.testFilesRepository.findByTest(testId);
  }

  async update(id: string, updateTestFileDto: UpdateTestFileDto) {
    // Verify file exists
    await this.findOne(id);

    // If testId is being changed, verify new test exists
    if (updateTestFileDto.testId) {
      await this.testsService.findOne(updateTestFileDto.testId);
    }

    const updateData: any = { ...updateTestFileDto };

    if (updateTestFileDto.expiresAt) {
      updateData.expiresAt = new Date(updateTestFileDto.expiresAt);
    }

    return this.testFilesRepository.update(id, updateData);
  }

  async remove(id: string) {
    // Verify file exists
    await this.findOne(id);

    await this.testFilesRepository.delete(id);

    return { message: `Test file with ID ${id} has been deleted` };
  }
}