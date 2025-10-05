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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TestFilesService } from './test-files.service';
import { CreateTestFileDto } from './dto/create-test-file.dto';
import { UpdateTestFileDto } from './dto/update-test-file.dto';

@ApiTags('Test files')
@Controller('test-files')
export class TestFilesController {
  constructor(private readonly testFilesService: TestFilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new test file metadata' })
  @ApiResponse({ status: 201, description: 'Test file metadata created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  create(@Body() createTestFileDto: CreateTestFileDto, @Request() req: any) {
    // TODO: Extract userId from authenticated request (Better Auth)
    const userId = req.user?.id || 'system';
    return this.testFilesService.create(createTestFileDto, userId);
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete test file metadata' })
  @ApiResponse({ status: 204, description: 'Test file metadata deleted successfully' })
  @ApiResponse({ status: 404, description: 'Test file not found' })
  remove(@Param('id') id: string) {
    return this.testFilesService.remove(id);
  }
}