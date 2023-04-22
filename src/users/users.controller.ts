import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  public async getAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  @Get('users/:id')
  public async getOne(@Param('id') id: string): Promise<User> {
    return await this.usersService.findById(id);
  }

  @Post('users')
  public async create(@Body() user: User): Promise<User> {
    return await this.usersService.create(user);
  }
}
