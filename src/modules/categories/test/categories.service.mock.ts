import type { Category } from '@database/schema/categories.schema'
import type { ICategoriesRepository } from '@modules/categories/interfaces/categories-repository.interface'

/**
 * Mock category data for testing
 */
export const mockCategory: Category = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Tests de Température',
  description: 'Validation des composants électroniques sous différentes conditions thermiques',
  baseSchema: {
    fields: [
      {
        key: 'temperature',
        label: 'Température (°C)',
        type: 'number',
        required: true,
        validation: { min: -50, max: 150 },
      },
      {
        key: 'duration',
        label: 'Durée (heures)',
        type: 'number',
        required: true,
      },
    ],
  },
  customFieldsSchema: {
    allowCustomFields: true,
    maxCustomFields: 10,
    allowedTypes: ['text', 'number', 'boolean', 'date'],
    fields: [],
  },
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
}

/**
 * Another mock category for testing multiple categories
 */
export const mockCategory2: Category = {
  id: '234e5678-e89b-12d3-a456-426614174001',
  name: 'Tests de Vibration',
  description: 'Tests de résistance aux vibrations mécaniques',
  baseSchema: {
    fields: [
      {
        key: 'frequency',
        label: 'Fréquence (Hz)',
        type: 'number',
        required: true,
      },
      {
        key: 'amplitude',
        label: 'Amplitude (mm)',
        type: 'number',
        required: true,
      },
    ],
  },
  customFieldsSchema: {
    allowCustomFields: false,
    maxCustomFields: 0,
    allowedTypes: [],
    fields: [],
  },
  createdAt: new Date('2024-01-02T10:00:00Z'),
  updatedAt: new Date('2024-01-02T10:00:00Z'),
}

/**
 * Array of mock categories
 */
export const mockCategories: Category[] = [mockCategory, mockCategory2]

/**
 * Mock repository for testing
 */
export const createMockCategoriesRepository = (): ICategoriesRepository => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
})
