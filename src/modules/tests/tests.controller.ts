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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiCookieAuth } from '@nestjs/swagger';
import { TestsService } from '@modules/tests/tests.service';
import { CreateTestDto } from '@modules/tests/dto/create-test.dto';
import { UpdateTestDto } from '@modules/tests/dto/update-test.dto';
import {User} from "@common/decorators/user.decorator";
import {UserDto} from "@/auth/dto/auth-response.dto";
import { AuthGuard } from '@/auth/guards/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';

@ApiTags('Tests')
@Controller('tests')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth()
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post()
  @Roles('contributor')
  @ApiOperation({ summary: 'Create a new test (contributor+)' })
  @ApiResponse({ status: 201, description: 'Test created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  create(@User() user: UserDto, @Body() createTestDto: CreateTestDto, @Request() req: any) {
    return this.testsService.create(createTestDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tests' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
  @ApiResponse({ status: 200, description: 'Return all tests' })
  findAll(@Query('categoryId') categoryId?: string) {
    if (categoryId) {
      return this.testsService.findByCategory(categoryId);
    }
    return this.testsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a test by ID' })
  @ApiResponse({ status: 200, description: 'Return the test' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  findOne(@Param('id') id: string) {
    return this.testsService.findOne(id);
  }

  @Patch(':id')
  @Roles('contributor')
  @ApiOperation({ summary: 'Update a test (contributor+)' })
  @ApiResponse({ status: 200, description: 'Test updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  update(@User() user: UserDto, @Param('id') id: string, @Body() updateTestDto: UpdateTestDto, @Request() req: any) {
    return this.testsService.update(id, updateTestDto, user.id);
  }

  @Delete(':id')
  @Roles('archivist')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a test (archivist+)' })
  @ApiResponse({ status: 204, description: 'Test deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  remove(@Param('id') id: string) {
    return this.testsService.remove(id);
  }
}