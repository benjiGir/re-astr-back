/**
 * Types for dynamic field schemas
 */

export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'array' | 'object'

export interface FieldValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: string[]
  // Array-specific validation
  minItems?: number
  maxItems?: number
  itemType?: FieldType
  // Object-specific validation
  properties?: Record<string, FieldDefinition>
}

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  required: boolean
  validation?: FieldValidation
  defaultValue?: any
}

export interface BaseSchema {
  fields: FieldDefinition[]
}

export interface CustomFieldsSchema {
  allowCustomFields: boolean
  maxCustomFields?: number
  allowedTypes?: FieldType[]
  fields: FieldDefinition[]
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
