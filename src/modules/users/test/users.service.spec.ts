import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { USERS_REPOSITORY, type IUsersRepository } from '../interfaces/users-repository.interface';
import { mockUser, mockUsers, mockContributorUser } from './users.service.mock';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { AssignRoleDto } from '../dto/assign-role.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repository: IUsersRepository;

  const mockRepository: IUsersRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    assignRole: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USERS_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<IUsersRepository>(USERS_REPOSITORY);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue(mockUsers);

      // Act
      const result = await service.findAll();

      // Assert
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(3);
    });

    it('should return an empty array when no users exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne(mockUser.id);

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id';
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(nonExistentId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        `User with ID ${nonExistentId} not found`,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      // Arrange
      jest.spyOn(repository, 'findByEmail').mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail(mockUser.email);

      // Assert
      expect(repository.findByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found by email', async () => {
      // Arrange
      const nonExistentEmail = 'nonexistent@example.com';
      jest.spyOn(repository, 'findByEmail').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByEmail(nonExistentEmail)).rejects.toThrow(NotFoundException);
      await expect(service.findByEmail(nonExistentEmail)).rejects.toThrow(
        `User with email ${nonExistentEmail} not found`,
      );
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        name: 'John Updated',
        image: 'https://example.com/new-avatar.jpg',
      };
      const updatedUser = { ...mockUser, ...updateDto };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'update').mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(mockUser.id, updateDto);

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(repository.update).toHaveBeenCalledWith(mockUser.id, updateDto);
      expect(result).toEqual(updatedUser);
      expect(result.name).toBe('John Updated');
    });

    it('should throw NotFoundException when user to update does not exist', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { name: 'Updated Name' };
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update email if not already taken', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'findByEmail').mockResolvedValue(null); // Email not taken
      jest.spyOn(repository, 'update').mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(mockUser.id, updateDto);

      // Assert
      expect(repository.findByEmail).toHaveBeenCalledWith(updateDto.email);
      expect(result.email).toBe(updateDto.email);
    });

    it('should throw ConflictException when email is already taken by another user', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: 'taken@example.com',
      };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'findByEmail').mockResolvedValue(mockContributorUser); // Email taken

      // Act & Assert
      await expect(service.update(mockUser.id, updateDto)).rejects.toThrow(ConflictException);
      await expect(service.update(mockUser.id, updateDto)).rejects.toThrow(
        `Email ${updateDto.email} is already in use`,
      );
    });

    it('should allow user to keep their own email when updating other fields', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: mockUser.email, // Same email
        name: 'Updated Name',
      };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'findByEmail').mockResolvedValue(mockUser); // Returns same user
      jest.spyOn(repository, 'update').mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(mockUser.id, updateDto);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when update returns null', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { name: 'Updated Name' };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'update').mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(mockUser.id, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(mockUser.id, updateDto)).rejects.toThrow(
        `Failed to update user with ID ${mockUser.id}`,
      );
    });
  });

  describe('assignRole', () => {
    it('should assign a role successfully', async () => {
      // Arrange
      const assignRoleDto: AssignRoleDto = { role: 'archivist' };
      const updatedUser = { ...mockUser, role: 'archivist' as const };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'assignRole').mockResolvedValue(updatedUser);

      // Act
      const result = await service.assignRole(mockUser.id, assignRoleDto);

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(repository.assignRole).toHaveBeenCalledWith(mockUser.id, assignRoleDto.role);
      expect(result.role).toBe('archivist');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const assignRoleDto: AssignRoleDto = { role: 'master' };
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.assignRole('non-existent-id', assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when assignRole returns null', async () => {
      // Arrange
      const assignRoleDto: AssignRoleDto = { role: 'master' };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'assignRole').mockResolvedValue(null);

      // Act & Assert
      await expect(service.assignRole(mockUser.id, assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.assignRole(mockUser.id, assignRoleDto)).rejects.toThrow(
        `Failed to assign role to user with ID ${mockUser.id}`,
      );
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined);

      // Act
      const result = await service.remove(mockUser.id);

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(repository.delete).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ message: `User with ID ${mockUser.id} has been deleted` });
    });

    it('should throw NotFoundException when user to delete does not exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});