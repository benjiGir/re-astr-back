import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  USERS_REPOSITORY,
  type IUsersRepository,
} from '../interfaces/users-repository.interface';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async findAll() {
    return this.usersRepository.findAll();
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    if (updateUserDto.email) {
      const existingUser = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(
          `Email ${updateUserDto.email} is already in use`,
        );
      }
    }

    const updatedUser = await this.usersRepository.update(id, updateUserDto);

    if (!updatedUser) {
      throw new NotFoundException(`Failed to update user with ID ${id}`);
    }

    return updatedUser;
  }

  async assignRole(id: string, assignRoleDto: AssignRoleDto) {
    await this.findOne(id);

    const updatedUser = await this.usersRepository.assignRole(
      id,
      assignRoleDto.role,
    );

    if (!updatedUser) {
      throw new NotFoundException(`Failed to assign role to user with ID ${id}`);
    }

    return updatedUser;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.usersRepository.delete(id);

    return { message: `User with ID ${id} has been deleted` };
  }
}