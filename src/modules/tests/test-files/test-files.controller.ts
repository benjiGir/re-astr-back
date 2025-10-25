import { User } from '@common/decorators/user.decorator'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { Roles } from '@/auth/decorators/roles.decorator'
import { UserDto } from '@/auth/dto/auth-response.dto'
import { AuthGuard } from '@/auth/guards/auth.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'
import { CreateTestFileDto } from './dto/create-test-file.dto'
import { UpdateTestFileDto } from './dto/update-test-file.dto'
import { UploadTestFileDto } from './dto/upload-test-file.dto'
import { TestFilesService } from './test-files.service'

@ApiTags('Test files')
@Controller('test-files')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth()
export class TestFilesController {
  constructor(private readonly testFilesService: TestFilesService) {}

  @Post()
  @Roles('contributor')
  @ApiOperation({ summary: 'Create a new test file metadata (contributor+)' })
  @ApiResponse({ status: 201, description: 'Test file metadata created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  create(
    @User() user: UserDto,
    @Body() createTestFileDto: CreateTestFileDto,
    @Request() _req: any,
  ) {
    return this.testFilesService.create(createTestFileDto, user.id)
  }

  @Get()
  @ApiOperation({ summary: 'Get all test files' })
  @ApiQuery({ name: 'testId', required: false, description: 'Filter by test ID' })
  @ApiResponse({ status: 200, description: 'Return all test files' })
  findAll(@Query('testId') testId?: string) {
    if (testId) {
      return this.testFilesService.findByTest(testId)
    }
    return this.testFilesService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a test file by ID' })
  @ApiResponse({ status: 200, description: 'Return the test file metadata' })
  @ApiResponse({ status: 404, description: 'Test file not found' })
  findOne(@Param('id') id: string) {
    return this.testFilesService.findOne(id)
  }

  @Patch(':id')
  @Roles('contributor')
  @ApiOperation({ summary: 'Update test file metadata (contributor+)' })
  @ApiResponse({ status: 200, description: 'Test file metadata updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Test file not found' })
  update(@Param('id') id: string, @Body() updateTestFileDto: UpdateTestFileDto) {
    return this.testFilesService.update(id, updateTestFileDto)
  }

  @Post('upload')
  @Roles('contributor')
  @ApiOperation({ summary: 'Upload a file to MinIO and create metadata (contributor+)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  async upload(@User() user: UserDto, @Request() req: any) {
    const data = await req.file()

    if (!data) {
      throw new BadRequestException('No file uploaded')
    }

    // Parse form fields
    const fields = data.fields as any
    const uploadDto: UploadTestFileDto = {
      testId: fields.testId?.value,
      fileType: fields.fileType?.value,
      metadata: fields.metadata?.value ? JSON.parse(fields.metadata.value) : undefined,
      expiresAt: fields.expiresAt?.value,
    }

    return this.testFilesService.uploadFile(data, uploadDto, user.id)
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file from MinIO' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async download(@Param('id') id: string, @Res() reply: FastifyReply) {
    const { stream, metadata } = await this.testFilesService.downloadFile(id)

    reply.header('Content-Type', metadata.mimeType)
    reply.header('Content-Disposition', `attachment; filename="${metadata.filename}"`)
    reply.header('Content-Length', metadata.size)

    return reply.send(stream)
  }

  @Get(':id/presigned-url')
  @ApiOperation({ summary: 'Get a presigned URL for temporary file access' })
  @ApiQuery({
    name: 'expirySeconds',
    required: false,
    description: 'URL expiry time in seconds (default: 3600)',
  })
  @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getPresignedUrl(@Param('id') id: string, @Query('expirySeconds') expirySeconds?: number) {
    const url = await this.testFilesService.getPresignedUrl(
      id,
      expirySeconds ? Number(expirySeconds) : 3600,
    )

    return { url }
  }

  @Delete(':id')
  @Roles('archivist')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete test file metadata (archivist+)' })
  @ApiResponse({ status: 204, description: 'Test file metadata deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Test file not found' })
  remove(@Param('id') id: string) {
    return this.testFilesService.remove(id)
  }
}
