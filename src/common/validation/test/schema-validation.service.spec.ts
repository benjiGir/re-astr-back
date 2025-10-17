import { Test, type TestingModule } from '@nestjs/testing'
import type { BaseSchema, CustomFieldsSchema } from '../schema.types'
import { SchemaValidationService } from '../schema-validation.service'

describe('SchemaValidationService', () => {
  let service: SchemaValidationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaValidationService],
    }).compile()

    service = module.get<SchemaValidationService>(SchemaValidationService)
  })

  describe('validateCommonData', () => {
    const baseSchema: BaseSchema = {
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
        {
          key: 'comment',
          label: 'Commentaire',
          type: 'text',
          required: false,
        },
      ],
    }

    it('should validate valid data', () => {
      const data = {
        temperature: 25,
        duration: 2,
      }

      const result = service.validateCommonData(data, baseSchema)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate with optional fields', () => {
      const data = {
        temperature: 25,
        duration: 2,
        comment: 'Test passed successfully',
      }

      const result = service.validateCommonData(data, baseSchema)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject missing required field', () => {
      const data = {
        temperature: 25,
        // Missing duration
      }

      const result = service.validateCommonData(data, baseSchema)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('duration')
    })

    it('should reject value below minimum', () => {
      const data = {
        temperature: -60, // Below min of -50
        duration: 2,
      }

      const result = service.validateCommonData(data, baseSchema)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].field).toBe('temperature')
    })

    it('should reject value above maximum', () => {
      const data = {
        temperature: 200, // Above max of 150
        duration: 2,
      }

      const result = service.validateCommonData(data, baseSchema)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].field).toBe('temperature')
    })

    it('should reject wrong type', () => {
      const data = {
        temperature: 'hot', // Should be number
        duration: 2,
      }

      const result = service.validateCommonData(data, baseSchema)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateCustomData', () => {
    it('should allow custom fields when enabled', () => {
      const customFieldsSchema: CustomFieldsSchema = {
        allowCustomFields: true,
        maxCustomFields: 5,
        allowedTypes: ['text', 'number', 'boolean'],
        fields: [],
      }

      const data = {
        customField1: 'value1',
        customField2: 42,
        customField3: true,
      }

      const result = service.validateCustomData(data, customFieldsSchema)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject custom fields when disabled', () => {
      const customFieldsSchema: CustomFieldsSchema = {
        allowCustomFields: false,
        fields: [],
      }

      const data = {
        customField1: 'value1',
      }

      const result = service.validateCustomData(data, customFieldsSchema)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('not allowed')
    })

    it('should reject exceeding max custom fields', () => {
      const customFieldsSchema: CustomFieldsSchema = {
        allowCustomFields: true,
        maxCustomFields: 2,
        fields: [],
      }

      const data = {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3', // Exceeds max of 2
      }

      const result = service.validateCustomData(data, customFieldsSchema)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Maximum 2 custom fields')
    })

    it('should reject disallowed types', () => {
      const customFieldsSchema: CustomFieldsSchema = {
        allowCustomFields: true,
        allowedTypes: ['text', 'number'],
        fields: [],
      }

      const data = {
        textField: 'valid',
        numberField: 42,
        dateField: '2024-01-01', // Date not allowed
      }

      const result = service.validateCustomData(data, customFieldsSchema)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].field).toBe('dateField')
    })

    it('should validate predefined custom fields', () => {
      const customFieldsSchema: CustomFieldsSchema = {
        allowCustomFields: true,
        fields: [
          {
            key: 'testEnv',
            label: 'Test Environment',
            type: 'text',
            required: true,
            validation: {
              enum: ['dev', 'staging', 'prod'],
            },
          },
        ],
      }

      const validData = {
        testEnv: 'staging',
      }

      const result = service.validateCustomData(validData, customFieldsSchema)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid enum value', () => {
      const customFieldsSchema: CustomFieldsSchema = {
        allowCustomFields: true,
        fields: [
          {
            key: 'testEnv',
            label: 'Test Environment',
            type: 'text',
            required: true,
            validation: {
              enum: ['dev', 'staging', 'prod'],
            },
          },
        ],
      }

      const invalidData = {
        testEnv: 'invalid',
      }

      const result = service.validateCustomData(invalidData, customFieldsSchema)

      expect(result.valid).toBe(false)
    })
  })

  describe('validateOrThrow', () => {
    it('should not throw on valid result', () => {
      const validResult = { valid: true, errors: [] }

      expect(() => {
        service.validateOrThrow(validResult, 'Test')
      }).not.toThrow()
    })

    it('should throw BadRequestException on invalid result', () => {
      const invalidResult = {
        valid: false,
        errors: [
          { field: 'temperature', message: 'Value too high' },
          { field: 'duration', message: 'Required field' },
        ],
      }

      expect(() => {
        service.validateOrThrow(invalidResult, 'commonData')
      }).toThrow('commonData validation failed')
    })
  })
})
