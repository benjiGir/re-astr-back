import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from 'src/users/schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UsersService) {}

  public async login(createUserDto: CreateUserDto) {
    throw new Error('Method not implemented.');
  }

  public async validateUser(LoginUserDto: LoginUserDto): Promise<User> {
    const { username, password } = LoginUserDto;

    const user = await this.userService.findOne(username);

    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
