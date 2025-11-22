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
    const shape: Record<string, ZodSchema> = {}

    for (const field of fields) {
      let fieldSchema = this.getZodSchemaForType(field.type)

      if (field.validation) {
        fieldSchema = this.applyValidationRules(fieldSchema, field.validation, field.type)
      }

      if (field.required) {
        shape[field.key] = fieldSchema
      } else {
        shape[field.key] = fieldSchema.optional()
      }
    }

    return z.object(shape)
  }

  private getZodSchemaForType(type: FieldType): ZodSchema {
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

    return result
  }

  private detectValueType(value: any): FieldType {
    if (typeof value === 'string') {
      if (!isNaN(Date.parse(value))) {
        return 'date'
      }
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'email'
      }
      try {
        new URL(value)
        return 'url'
      } catch {
        return 'text'
      }
    }
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (value instanceof Date) return 'date'

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
