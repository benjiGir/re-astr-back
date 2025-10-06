import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Request,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { TestFilesService } from './test-files.service';
import { CreateTestFileDto } from './dto/create-test-file.dto';
import { UpdateTestFileDto } from './dto/update-test-file.dto';
import { UploadTestFileDto } from './dto/upload-test-file.dto';
import { FastifyReply } from "fastify";
import {User} from "@common/decorators/user.decorator";
import {UserDto} from "@/auth/dto/auth-response.dto";

@ApiTags('Test files')
@Controller('test-files')
export class TestFilesController {
  constructor(private readonly testFilesService: TestFilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new test file metadata' })
  @ApiResponse({ status: 201, description: 'Test file metadata created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  create(@User() user: UserDto, @Body() createTestFileDto: CreateTestFileDto, @Request() req: any) {
    return this.testFilesService.create(createTestFileDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all test files' })
  @ApiQuery({ name: 'testId', required: false, description: 'Filter by test ID' })
  @ApiResponse({ status: 200, description: 'Return all test files' })
  findAll(@Query('testId') testId?: string) {
    if (testId) {
      return this.testFilesService.findByTest(testId);
    }
    return this.testFilesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a test file by ID' })
  @ApiResponse({ status: 200, description: 'Return the test file metadata' })
  @ApiResponse({ status: 404, description: 'Test file not found' })
  findOne(@Param('id') id: string) {
    return this.testFilesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update test file metadata' })
  @ApiResponse({ status: 200, description: 'Test file metadata updated successfully' })
  @ApiResponse({ status: 404, description: 'Test file not found' })
  update(@Param('id') id: string, @Body() updateTestFileDto: UpdateTestFileDto) {
    return this.testFilesService.update(id, updateTestFileDto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to MinIO and create metadata' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or input' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  async upload(@User() user: UserDto, @Request() req: any) {
    const data = await req.file();

    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    // Parse form fields
    const fields = data.fields as any;
    const uploadDto: UploadTestFileDto = {
      testId: fields.testId?.value,
      fileType: fields.fileType?.value,
      metadata: fields.metadata?.value ? JSON.parse(fields.metadata.value) : undefined,
      expiresAt: fields.expiresAt?.value,
    };

    return this.testFilesService.uploadFile(data, uploadDto, user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file from MinIO' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async download(@Param('id') id: string, @Res() reply: FastifyReply) {
    const { stream, metadata } = await this.testFilesService.downloadFile(id);

    reply.header('Content-Type', metadata.mimeType);
    reply.header('Content-Disposition', `attachment; filename="${metadata.filename}"`);
    reply.header('Content-Length', metadata.size);

    return reply.send(stream);
  }

  @Get(':id/presigned-url')
  @ApiOperation({ summary: 'Get a presigned URL for temporary file access' })
  @ApiQuery({ name: 'expirySeconds', required: false, description: 'URL expiry time in seconds (default: 3600)' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getPresignedUrl(
    @Param('id') id: string,
    @Query('expirySeconds') expirySeconds?: number,
  ) {
    const url = await this.testFilesService.getPresignedUrl(
      id,
      expirySeconds ? Number(expirySeconds) : 3600,
    );

    return { url };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete test file metadata' })
  @ApiResponse({ status: 204, description: 'Test file metadata deleted successfully' })
  @ApiResponse({ status: 404, description: 'Test file not found' })
  remove(@Param('id') id: string) {
    return this.testFilesService.remove(id);
  }
}