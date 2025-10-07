import type { User } from '@database/schema/users.schema';

export const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'John Doe',
  email: 'john.doe@example.com',
  emailVerified: true,
  image: 'https://example.com/avatar.jpg',
  role: 'user',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockMasterUser: User = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  name: 'Admin Master',
  email: 'admin@example.com',
  emailVerified: true,
  image: 'https://example.com/admin.jpg',
  role: 'master',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockContributorUser: User = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  name: 'Jane Contributor',
  email: 'jane@example.com',
  emailVerified: false,
  image: '',
  role: 'contributor',
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
};

export const mockUsers: User[] = [mockUser, mockMasterUser, mockContributorUser];