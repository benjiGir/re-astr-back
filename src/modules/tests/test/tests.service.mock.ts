import type { Test } from '@database/schema/tests.schema';

export const mockTest: Test = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  categoryId: 'cat-123',
  name: 'Test de température #001',
  description: 'Validation de la résistance aux températures extrêmes',
  status: 'draft',
  commonData: {
    temperature: 25,
    humidity: 60,
    pressure: 101.3,
  },
  customData: {
    notes: 'Test initial',
  },
  metadata: {
    location: 'Lab A',
  },
  createdBy: 'user-123',
  updatedBy: 'user-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  completedAt: null,
};

export const mockCompletedTest: Test = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  categoryId: 'cat-123',
  name: 'Test de température #002',
  description: 'Test complété avec succès',
  status: 'completed',
  commonData: {
    temperature: 30,
    humidity: 55,
    pressure: 102.1,
  },
  customData: {},
  metadata: {},
  createdBy: 'user-123',
  updatedBy: 'user-123',
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-03'),
  completedAt: new Date('2024-01-03'),
};

export const mockInProgressTest: Test = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  categoryId: 'cat-456',
  name: 'Test de résistance #001',
  description: 'Test en cours',
  status: 'in_progress',
  commonData: {
    force: 150,
    duration: 3600,
  },
  customData: {
    operator: 'John Doe',
  },
  metadata: {
    equipment: 'Machine XYZ',
  },
  createdBy: 'user-456',
  updatedBy: 'user-456',
  createdAt: new Date('2024-01-05'),
  updatedAt: new Date('2024-01-06'),
  completedAt: null,
};

export const mockTests: Test[] = [mockTest, mockCompletedTest, mockInProgressTest];