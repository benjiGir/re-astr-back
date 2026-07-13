export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'array' | 'object'

export interface FieldValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: string[]
  minItems?: number
  maxItems?: number
  itemType?: FieldType
  properties?: Record<string, FieldDefinition>
}

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  required: boolean
  validation?: FieldValidation
  defaultValue?: unknown
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
