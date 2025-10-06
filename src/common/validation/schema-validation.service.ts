import { Injectable, BadRequestException } from '@nestjs/common';
import { z, ZodSchema, ZodError } from 'zod';
import type {
  BaseSchema,
  CustomFieldsSchema,
  FieldDefinition,
  FieldType,
  ValidationResult,
  ValidationError,
} from './schema.types';

@Injectable()
export class SchemaValidationService {
  /**
   * Validate commonData against the category's baseSchema
   */
  validateCommonData(data: Record<string, any>, baseSchema: BaseSchema): ValidationResult {
    try {
      const zodSchema = this.buildZodSchemaFromFields(baseSchema.fields);
      zodSchema.parse(data);

      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: this.formatZodErrors(error),
        };
      }
      throw error;
    }
  }

  /**
   * Validate customData against the category's customFieldsSchema
   */
  validateCustomData(
    data: Record<string, any>,
    customFieldsSchema: CustomFieldsSchema,
  ): ValidationResult {
    // If custom fields are not allowed, data must be empty
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
        };
      }
      return { valid: true, errors: [] };
    }

    // Check max custom fields limit
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
      };
    }

    // Validate predefined custom fields
    if (customFieldsSchema.fields.length > 0) {
      try {
        const zodSchema = this.buildZodSchemaFromFields(customFieldsSchema.fields);
        zodSchema.parse(data);
        return { valid: true, errors: [] };
      } catch (error) {
        if (error instanceof ZodError) {
          return {
            valid: false,
            errors: this.formatZodErrors(error),
          };
        }
        throw error;
      }
    }

    // Validate allowed types for ad-hoc custom fields
    if (customFieldsSchema.allowedTypes && customFieldsSchema.allowedTypes.length > 0) {
      const errors: ValidationError[] = [];

      for (const [key, value] of Object.entries(data)) {
        const detectedType = this.detectValueType(value);
        if (!customFieldsSchema.allowedTypes.includes(detectedType)) {
          errors.push({
            field: key,
            message: `Type '${detectedType}' not allowed. Allowed types: ${customFieldsSchema.allowedTypes.join(', ')}`,
            value,
          });
        }
      }

      if (errors.length > 0) {
        return { valid: false, errors };
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * Build a Zod schema from an array of field definitions
   */
  private buildZodSchemaFromFields(fields: FieldDefinition[]): ZodSchema {
    const shape: Record<string, ZodSchema> = {};

    for (const field of fields) {
      let fieldSchema = this.getZodSchemaForType(field.type);

      // Apply validation rules
      if (field.validation) {
        fieldSchema = this.applyValidationRules(fieldSchema, field.validation, field.type);
      }

      // Handle required vs optional
      if (field.required) {
        shape[field.key] = fieldSchema;
      } else {
        shape[field.key] = fieldSchema.optional();
      }
    }

    return z.object(shape);
  }

  /**
   * Get base Zod schema for a field type
   */
  private getZodSchemaForType(type: FieldType): ZodSchema {
    switch (type) {
      case 'text':
        return z.string();
      case 'number':
        return z.number();
      case 'boolean':
        return z.boolean();
      case 'date':
        return z.string().datetime().or(z.date());
      case 'email':
        return z.string().email();
      case 'url':
        return z.string().url();
      default:
        return z.string();
    }
  }

  /**
   * Apply validation rules to a Zod schema
   */
  private applyValidationRules(
    schema: ZodSchema,
    validation: any,
    type: FieldType,
  ): ZodSchema {
    let result = schema;

    if (type === 'number') {
      if (validation.min !== undefined) {
        result = (result as z.ZodNumber).min(validation.min);
      }
      if (validation.max !== undefined) {
        result = (result as z.ZodNumber).max(validation.max);
      }
    }

    if (type === 'text') {
      if (validation.minLength !== undefined) {
        result = (result as z.ZodString).min(validation.minLength);
      }
      if (validation.maxLength !== undefined) {
        result = (result as z.ZodString).max(validation.maxLength);
      }
      if (validation.pattern) {
        result = (result as z.ZodString).regex(new RegExp(validation.pattern));
      }
      if (validation.enum) {
        result = z.enum(validation.enum as [string, ...string[]]);
      }
    }

    return result;
  }

  /**
   * Detect the type of a value
   */
  private detectValueType(value: any): FieldType {
    if (typeof value === 'string') {
      // Check if it's a date
      if (!isNaN(Date.parse(value))) {
        return 'date';
      }
      // Check if it's an email
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'email';
      }
      // Check if it's a URL
      try {
        new URL(value);
        return 'url';
      } catch {
        return 'text';
      }
    }
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';

    return 'text';
  }

  /**
   * Format Zod errors into our ValidationError format
   */
  private formatZodErrors(error: ZodError): ValidationError[] {
    return error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.path.length > 0 ? undefined : err,
    }));
  }

  /**
   * Throw BadRequestException if validation fails
   */
  validateOrThrow(result: ValidationResult, context: string): void {
    if (!result.valid) {
      const errorMessages = result.errors
        .map((err) => `${err.field}: ${err.message}`)
        .join('; ');

      throw new BadRequestException(`${context} validation failed: ${errorMessages}`);
    }
  }
}