import { BadRequestException, Injectable } from '@nestjs/common'
import { ZodError, type ZodSchema, z } from 'zod'
import type {
  BaseSchema,
  CustomFieldsSchema,
  FieldDefinition,
  FieldType,
  ValidationError,
  ValidationResult,
} from './schema.types'

@Injectable()
export class SchemaValidationService {
  // Cache for compiled Zod schemas to improve performance
  private readonly zodSchemaCache = new Map<string, ZodSchema>()

  // Zod schemas for validating schema definitions themselves
  private readonly fieldTypeSchema = z.enum([
    'text',
    'number',
    'boolean',
    'date',
    'email',
    'url',
    'array',
    'object',
  ])

  private readonly fieldValidationSchema = z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
      enum: z.array(z.string()).optional(),
    })
    .optional()

  private readonly fieldDefinitionSchema = z.object({
    key: z.string().min(1, 'Field key must not be empty'),
    label: z.string().min(1, 'Field label must not be empty'),
    type: this.fieldTypeSchema,
    required: z.boolean(),
    validation: this.fieldValidationSchema,
    defaultValue: z.any().optional(),
  })

  private readonly baseSchemaSchema = z.object({
    fields: z.array(this.fieldDefinitionSchema),
  })

  private readonly customFieldsSchemaSchema = z.object({
    allowCustomFields: z.boolean(),
    maxCustomFields: z.number().positive().optional(),
    allowedTypes: z.array(this.fieldTypeSchema).optional(),
    fields: z.array(this.fieldDefinitionSchema),
  })

  /**
   * Validates a BaseSchema definition
   */
  validateBaseSchema(schema: unknown): ValidationResult {
    try {
      this.baseSchemaSchema.parse(schema)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: this.formatZodErrors(error),
        }
      }
      throw error
    }
  }

  /**
   * Validates a CustomFieldsSchema definition
   */
  validateCustomFieldsSchema(schema: unknown): ValidationResult {
    try {
      this.customFieldsSchemaSchema.parse(schema)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: this.formatZodErrors(error),
        }
      }
      throw error
    }
  }

  validateCommonData(data: Record<string, any>, baseSchema: BaseSchema): ValidationResult {
    try {
      const zodSchema = this.buildZodSchemaFromFields(baseSchema.fields)
      zodSchema.parse(data)

      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: this.formatZodErrors(error),
        }
      }
      throw error
    }
  }

  validateCustomData(
    data: Record<string, any>,
    customFieldsSchema: CustomFieldsSchema,
  ): ValidationResult {
    if (!customFieldsSchema.allowCustomFields) {
      if (Object.keys(data).length > 0) {
        return {
          valid: false,
          errors: [
            {
              field: 'customData',
              message: 'Custom fields are not allowed for this category',
            },
          ],
        }
      }
      return { valid: true, errors: [] }
    }

    if (
      customFieldsSchema.maxCustomFields &&
      Object.keys(data).length > customFieldsSchema.maxCustomFields
    ) {
      return {
        valid: false,
        errors: [
          {
            field: 'customData',
            message: `Maximum ${customFieldsSchema.maxCustomFields} custom fields allowed, got ${Object.keys(data).length}`,
          },
        ],
      }
    }

    const allErrors: ValidationError[] = []

    // Step 1: Validate predefined fields if any
    if (customFieldsSchema.fields.length > 0) {
      try {
        const zodSchema = this.buildZodSchemaFromFields(customFieldsSchema.fields)
        zodSchema.parse(data)
      } catch (error) {
        if (error instanceof ZodError) {
          allErrors.push(...this.formatZodErrors(error))
        } else {
          throw error
        }
      }
    }

    // Step 2: Validate additional fields (not in predefined fields) against allowedTypes
    if (customFieldsSchema.allowedTypes && customFieldsSchema.allowedTypes.length > 0) {
      const predefinedKeys = new Set(customFieldsSchema.fields.map((f) => f.key))
      const additionalFields = Object.entries(data).filter(([key]) => !predefinedKeys.has(key))

      for (const [key, value] of additionalFields) {
        const detectedType = this.detectValueType(value)
        if (!customFieldsSchema.allowedTypes.includes(detectedType)) {
          allErrors.push({
            field: key,
            message: `Type '${detectedType}' not allowed. Allowed types: ${customFieldsSchema.allowedTypes.join(', ')}`,
            value,
          })
        }
      }
    }

    if (allErrors.length > 0) {
      return { valid: false, errors: allErrors }
    }

    return { valid: true, errors: [] }
  }

  private buildZodSchemaFromFields(fields: FieldDefinition[]): ZodSchema {
    // Create a cache key from the fields configuration
    const cacheKey = JSON.stringify(fields)

    // Check if we already have this schema compiled
    const cachedSchema = this.zodSchemaCache.get(cacheKey)
    if (cachedSchema) {
      return cachedSchema
    }

    const shape: Record<string, ZodSchema> = {}

    for (const field of fields) {
      let fieldSchema = this.getZodSchemaForType(field.type, field.validation)

      if (field.validation) {
        fieldSchema = this.applyValidationRules(fieldSchema, field.validation, field.type)
      }

      if (field.required) {
        shape[field.key] = fieldSchema
      } else {
        shape[field.key] = fieldSchema.optional()
      }
    }

    const schema = z.object(shape)

    // Cache the compiled schema
    this.zodSchemaCache.set(cacheKey, schema)

    return schema
  }

  private getZodSchemaForType(type: FieldType, validation?: any): ZodSchema {
    switch (type) {
      case 'text':
        return z.string()
      case 'number':
        return z.number()
      case 'boolean':
        return z.boolean()
      case 'date':
        return z.string().datetime().or(z.date())
      case 'email':
        return z.string().email()
      case 'url':
        return z.string().url()
      case 'array':
        // Determine array item type
        if (validation?.itemType) {
          const itemSchema = this.getZodSchemaForType(validation.itemType)
          return z.array(itemSchema)
        }
        return z.array(z.any())
      case 'object':
        // Support nested object validation
        if (validation?.properties) {
          const nestedShape: Record<string, ZodSchema> = {}
          for (const [key, fieldDef] of Object.entries(validation.properties)) {
            const def = fieldDef as any
            let schema = this.getZodSchemaForType(def.type, def.validation)
            if (def.validation) {
              schema = this.applyValidationRules(schema, def.validation, def.type)
            }
            nestedShape[key] = def.required ? schema : schema.optional()
          }
          return z.object(nestedShape)
        }
        return z.record(z.string(), z.any())
      default:
        return z.string()
    }
  }

  private applyValidationRules(schema: ZodSchema, validation: any, type: FieldType): ZodSchema {
    let result = schema

    if (type === 'number') {
      if (validation.min !== undefined) {
        result = (result as z.ZodNumber).min(validation.min)
      }
      if (validation.max !== undefined) {
        result = (result as z.ZodNumber).max(validation.max)
      }
    }

    if (type === 'text') {
      if (validation.minLength !== undefined) {
        result = (result as z.ZodString).min(validation.minLength)
      }
      if (validation.maxLength !== undefined) {
        result = (result as z.ZodString).max(validation.maxLength)
      }
      if (validation.pattern) {
        result = (result as z.ZodString).regex(new RegExp(validation.pattern))
      }
      if (validation.enum) {
        result = z.enum(validation.enum as [string, ...string[]])
      }
    }

    if (type === 'array') {
      if (validation.minItems !== undefined) {
        result = (result as z.ZodArray<any>).min(validation.minItems)
      }
      if (validation.maxItems !== undefined) {
        result = (result as z.ZodArray<any>).max(validation.maxItems)
      }
    }

    return result
  }

  private detectValueType(value: any): FieldType {
    // Handle null/undefined
    if (value === null || value === undefined) return 'text'

    // Handle arrays first (before object check since arrays are objects)
    if (Array.isArray(value)) return 'array'

    // Handle Date instances
    if (value instanceof Date) return 'date'

    // Handle primitive types
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'

    // Handle objects (plain objects, not arrays or dates)
    if (typeof value === 'object' && value !== null) {
      // Check if it's a plain object (not an instance of a class)
      if (value.constructor === Object) {
        return 'object'
      }
      // If it's an instance of a class, treat as text for safety
      return 'text'
    }

    if (typeof value === 'string') {
      // Check for ISO 8601 date format (strict)
      // Matches: 2024-01-01, 2024-01-01T12:00:00, 2024-01-01T12:00:00.000Z, etc.
      const iso8601Regex =
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/
      if (iso8601Regex.test(value)) {
        // Double-check it's a valid date
        const parsed = Date.parse(value)
        if (!isNaN(parsed)) {
          return 'date'
        }
      }

      // Check for email format (aligned with common email validation)
      // More strict than simple pattern to avoid false positives
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (emailRegex.test(value)) {
        return 'email'
      }

      // Check for URL format
      // Must start with http:// or https:// to avoid false positives
      if (value.startsWith('http://') || value.startsWith('https://')) {
        try {
          new URL(value)
          return 'url'
        } catch {
          // Invalid URL, fall through to text
        }
      }

      return 'text'
    }

    // Default to text for any other type
    return 'text'
  }

  private formatZodErrors(error: ZodError): ValidationError[] {
    return error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.path.length > 0 ? undefined : err,
    }))
  }

  validateOrThrow(result: ValidationResult, context: string): void {
    if (!result.valid) {
      const errorMessages = result.errors.map((err) => `${err.field}: ${err.message}`).join('; ')

      throw new BadRequestException(`${context} validation failed: ${errorMessages}`)
    }
  }
}
