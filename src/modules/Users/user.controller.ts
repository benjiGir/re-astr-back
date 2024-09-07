import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ParamsGetUsersDto } from './dto/params-user.dto'
import { ResponseUsersDto, UserDto } from './dto/responses-user.dto'

@ApiTags('Users')
@Controller('Users')
export class UserController {
  constructor() {}

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Get all users by roles',
  })
  @ApiOkResponse({ type: ResponseUsersDto })
  async getUsers(
    @Query() params: ParamsGetUsersDto,
  ): Promise<ResponseUsersDto> {
    return
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a user by id',
  })
  @ApiOkResponse({ type: UserDto })
  async getUserById(@Param('id') id: string): Promise<UserDto> {
    return
  }

  @Post()
  @ApiOperation({})
  @ApiOkResponse({ type: UserDto })
  async createUser(@Body() body: UserDto): Promise<UserDto> {
    return
  }
}
