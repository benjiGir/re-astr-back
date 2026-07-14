import { Schema } from 'effect'

export const FieldType = Schema.Literals([
  'text',
  'number',
  'boolean',
  'date',
  'email',
  'url',
  'array',
  'object',
])
export type FieldType = typeof FieldType.Type

export class FieldValidation extends Schema.Class<FieldValidation>('FieldValidation')({
  min: Schema.optional(Schema.Number),
  max: Schema.optional(Schema.Number),
  minLength: Schema.optional(Schema.Number),
  maxLength: Schema.optional(Schema.Number),
  pattern: Schema.optional(Schema.String),
  enum: Schema.optional(Schema.Array(Schema.String)),
  minItems: Schema.optional(Schema.Number),
  maxItems: Schema.optional(Schema.Number),
  itemType: Schema.optional(FieldType),
  properties: Schema.optional(
    Schema.Record(
      Schema.String,
      Schema.suspend((): Schema.Schema<FieldDefinition> => FieldDefinition),
    ),
  ),
}) {}

export class FieldDefinition extends Schema.Class<FieldDefinition>('FieldDefinition')({
  key: Schema.String.check(Schema.isMinLength(1)),
  label: Schema.String.check(Schema.isMinLength(1)),
  type: FieldType,
  required: Schema.Boolean,
  validation: Schema.optional(Schema.suspend((): Schema.Schema<FieldValidation> => FieldValidation)),
  defaultValue: Schema.optional(Schema.Unknown),
}) {}

export const BaseSchema = Schema.Struct({
  fields: Schema.Array(FieldDefinition),
})
export type BaseSchema = typeof BaseSchema.Type

export const CustomFieldsSchema = Schema.Struct({
  allowCustomFields: Schema.Boolean,
  maxCustomFields: Schema.optional(Schema.Number.check(Schema.isGreaterThan(0))),
  allowedTypes: Schema.optional(Schema.Array(FieldType)),
  fields: Schema.Array(FieldDefinition),
})
export type CustomFieldsSchema = typeof CustomFieldsSchema.Type
