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

// Struct, not Class: these are only ever built from plain JSON (jsonb columns,
// HTTP payloads), never via `new FieldDefinition(...)`. A Class's constructor
// requires nested Class-typed fields to already be instances of that class —
// a plain object straight off a DB row (structurally identical) fails with
// "Expected FieldValidation, got {...}". Struct has no such instance
// requirement, so plain data works either way. Found live: GET /categories
// 500ed on every seeded row because of exactly this.
//
// The `interface X extends Schema.Struct.Type<typeof XFields>` + separate
// `Fields` object is needed (not the usual `export type X = typeof X.Type`)
// because FieldValidation and FieldDefinition are mutually recursive —
// deriving each type from the other's *value* circularly fails to typecheck
// ("circularly references itself"). Declaring the type as an independent
// `interface` breaks the cycle the same way a class's own name would.
export interface FieldValidation extends Schema.Struct.Type<typeof FieldValidationFields> {}
const FieldValidationFields = {
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
}
export const FieldValidation: Schema.Schema<FieldValidation> = Schema.Struct(
  FieldValidationFields,
).annotate({
  identifier: 'FieldValidation',
})

export interface FieldDefinition extends Schema.Struct.Type<typeof FieldDefinitionFields> {}
const FieldDefinitionFields = {
  key: Schema.String.check(Schema.isMinLength(1)),
  label: Schema.String.check(Schema.isMinLength(1)),
  type: FieldType,
  required: Schema.Boolean,
  validation: Schema.optional(
    Schema.suspend((): Schema.Schema<FieldValidation> => FieldValidation),
  ),
  defaultValue: Schema.optional(Schema.Unknown),
}
export const FieldDefinition: Schema.Schema<FieldDefinition> = Schema.Struct(
  FieldDefinitionFields,
).annotate({
  identifier: 'FieldDefinition',
})

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
