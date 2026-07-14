import { describe, expect, it } from 'vitest'
import type { BaseSchema, CustomFieldsSchema } from '@/domain/schema/CategoryFields.js'
import {
  detectValueType,
  validateBaseSchema,
  validateCommonData,
  validateCustomData,
  validateCustomFieldsSchema,
} from '@/common/validation/SchemaValidation.js'

describe('validateCommonData', () => {
  const baseSchema: BaseSchema = {
    fields: [
      { key: 'temperature', label: 'Température (°C)', type: 'number', required: true, validation: { min: -50, max: 150 } },
      { key: 'duration', label: 'Durée (heures)', type: 'number', required: true },
      { key: 'comment', label: 'Commentaire', type: 'text', required: false },
    ],
  }

  it('validates valid data', () => {
    const result = validateCommonData({ temperature: 25, duration: 2 }, baseSchema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('validates with optional fields', () => {
    const result = validateCommonData({ temperature: 25, duration: 2, comment: 'Test passed successfully' }, baseSchema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects missing required field', () => {
    const result = validateCommonData({ temperature: 25 }, baseSchema)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.field).toBe('duration')
  })

  it('rejects value below minimum', () => {
    const result = validateCommonData({ temperature: -60, duration: 2 }, baseSchema)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.field).toBe('temperature')
  })

  it('rejects value above maximum', () => {
    const result = validateCommonData({ temperature: 200, duration: 2 }, baseSchema)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.field).toBe('temperature')
  })

  it('rejects wrong type', () => {
    const result = validateCommonData({ temperature: 'hot', duration: 2 }, baseSchema)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('validateCustomData', () => {
  it('allows custom fields when enabled', () => {
    const schema: CustomFieldsSchema = { allowCustomFields: true, maxCustomFields: 5, allowedTypes: ['text', 'number', 'boolean'], fields: [] }
    const result = validateCustomData({ customField1: 'value1', customField2: 42, customField3: true }, schema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects custom fields when disabled', () => {
    const schema: CustomFieldsSchema = { allowCustomFields: false, fields: [] }
    const result = validateCustomData({ customField1: 'value1' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.message).toContain('not allowed')
  })

  it('rejects exceeding max custom fields', () => {
    const schema: CustomFieldsSchema = { allowCustomFields: true, maxCustomFields: 2, fields: [] }
    const result = validateCustomData({ field1: 'value1', field2: 'value2', field3: 'value3' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.message).toContain('Maximum 2 custom fields')
  })

  it('rejects disallowed types', () => {
    const schema: CustomFieldsSchema = { allowCustomFields: true, allowedTypes: ['text', 'number'], fields: [] }
    const result = validateCustomData({ textField: 'valid', numberField: 42, dateField: '2024-01-01' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.field).toBe('dateField')
  })

  it('validates predefined custom fields', () => {
    const schema: CustomFieldsSchema = {
      allowCustomFields: true,
      fields: [{ key: 'testEnv', label: 'Test Environment', type: 'text', required: true, validation: { enum: ['dev', 'staging', 'prod'] } }],
    }
    expect(validateCustomData({ testEnv: 'staging' }, schema).valid).toBe(true)
    expect(validateCustomData({ testEnv: 'invalid' }, schema).valid).toBe(false)
  })

  it('validates both predefined fields AND additional fields against allowedTypes', () => {
    const schema: CustomFieldsSchema = {
      allowCustomFields: true,
      allowedTypes: ['text', 'number'],
      fields: [{ key: 'operator', label: 'Operator', type: 'text', required: false }],
    }
    const result = validateCustomData({ operator: 'John Doe', testNumber: 42, notes: 'Some notes' }, schema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects additional fields with disallowed types even when predefined fields exist', () => {
    const schema: CustomFieldsSchema = {
      allowCustomFields: true,
      allowedTypes: ['text', 'number'],
      fields: [{ key: 'operator', label: 'Operator', type: 'text', required: false }],
    }
    const result = validateCustomData({ operator: 'John Doe', testDate: '2024-01-01' }, schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.field).toBe('testDate')
    expect(result.errors[0]?.message).toContain("Type 'date' not allowed")
  })

  it('accumulates errors from both predefined field validation and type checking', () => {
    const schema: CustomFieldsSchema = {
      allowCustomFields: true,
      allowedTypes: ['text', 'number'],
      fields: [{ key: 'operator', label: 'Operator', type: 'text', required: true }],
    }
    const result = validateCustomData({ testDate: '2024-01-01' }, schema)
    expect(result.valid).toBe(false)
    const fields = result.errors.map((e) => e.field)
    expect(fields).toContain('operator')
    expect(fields).toContain('testDate')
  })

  it('detects array and object types against allowedTypes', () => {
    expect(validateCustomData({ tags: ['a', 'b'] }, { allowCustomFields: true, allowedTypes: ['array'], fields: [] }).valid).toBe(true)
    expect(validateCustomData({ metadata: { a: 1 } }, { allowCustomFields: true, allowedTypes: ['object'], fields: [] }).valid).toBe(true)

    const rejected = validateCustomData({ tags: ['a', 'b'] }, { allowCustomFields: true, allowedTypes: ['object'], fields: [] })
    expect(rejected.valid).toBe(false)
    expect(rejected.errors[0]?.message).toContain("Type 'array' not allowed")
  })
})

describe('validateBaseSchema', () => {
  it('accepts a valid baseSchema', () => {
    const result = validateBaseSchema({
      fields: [{ key: 'temperature', label: 'Temperature', type: 'number', required: true, validation: { min: -50, max: 150 } }],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('accepts an empty fields array', () => {
    expect(validateBaseSchema({ fields: [] }).valid).toBe(true)
  })

  it('rejects an empty field key', () => {
    const result = validateBaseSchema({ fields: [{ key: '', label: 'Temperature', type: 'number', required: true }] })
    expect(result.valid).toBe(false)
  })

  it('rejects an invalid field type', () => {
    const result = validateBaseSchema({ fields: [{ key: 'test', label: 'Test', type: 'invalid_type', required: true }] })
    expect(result.valid).toBe(false)
  })
})

describe('validateCustomFieldsSchema', () => {
  it('accepts a valid customFieldsSchema', () => {
    const result = validateCustomFieldsSchema({ allowCustomFields: true, maxCustomFields: 10, allowedTypes: ['text', 'number'], fields: [] })
    expect(result.valid).toBe(true)
  })

  it('accepts the minimal shape', () => {
    expect(validateCustomFieldsSchema({ allowCustomFields: false, fields: [] }).valid).toBe(true)
  })

  it('rejects a negative maxCustomFields', () => {
    expect(validateCustomFieldsSchema({ allowCustomFields: true, maxCustomFields: -5, fields: [] }).valid).toBe(false)
  })

  it('rejects an invalid allowedType', () => {
    expect(validateCustomFieldsSchema({ allowCustomFields: true, allowedTypes: ['text', 'invalid_type'], fields: [] }).valid).toBe(false)
  })
})

describe('validateCommonData with array and object field types', () => {
  it('validates array fields with itemType and item bounds', () => {
    const baseSchema: BaseSchema = {
      fields: [{ key: 'tags', label: 'Tags', type: 'array', required: true, validation: { itemType: 'text', minItems: 1, maxItems: 5 } }],
    }
    expect(validateCommonData({ tags: ['tag1', 'tag2', 'tag3'] }, baseSchema).valid).toBe(true)
  })

  it('rejects an array with too many items', () => {
    const baseSchema: BaseSchema = {
      fields: [{ key: 'tags', label: 'Tags', type: 'array', required: true, validation: { itemType: 'text', maxItems: 3 } }],
    }
    expect(validateCommonData({ tags: ['tag1', 'tag2', 'tag3', 'tag4'] }, baseSchema).valid).toBe(false)
  })

  it('validates nested object fields', () => {
    const baseSchema: BaseSchema = {
      fields: [
        {
          key: 'metadata',
          label: 'Metadata',
          type: 'object',
          required: true,
          validation: {
            properties: {
              author: { key: 'author', label: 'Author', type: 'text', required: true },
              version: { key: 'version', label: 'Version', type: 'number', required: false },
            },
          },
        },
      ],
    }
    expect(validateCommonData({ metadata: { author: 'John Doe', version: 1 } }, baseSchema).valid).toBe(true)
  })

  it('rejects an object missing a required nested field', () => {
    const baseSchema: BaseSchema = {
      fields: [
        {
          key: 'metadata',
          label: 'Metadata',
          type: 'object',
          required: true,
          validation: { properties: { author: { key: 'author', label: 'Author', type: 'text', required: true } } },
        },
      ],
    }
    expect(validateCommonData({ metadata: { version: 1 } }, baseSchema).valid).toBe(false)
  })
})

describe('detectValueType', () => {
  it('detects the primitive and structural types used by validateCustomData', () => {
    expect(detectValueType(42)).toBe('number')
    expect(detectValueType(true)).toBe('boolean')
    expect(detectValueType(['a', 'b'])).toBe('array')
    expect(detectValueType({ a: 1 })).toBe('object')
    expect(detectValueType('hello')).toBe('text')
    expect(detectValueType('someone@example.com')).toBe('email')
    expect(detectValueType('https://example.com')).toBe('url')
    expect(detectValueType('2024-01-01T00:00:00Z')).toBe('date')
  })
})
