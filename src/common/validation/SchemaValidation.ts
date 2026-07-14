import { Effect, Schema } from 'effect'
import {
  BaseSchema,
  CustomFieldsSchema,
  type FieldDefinition,
  type FieldType,
  type FieldValidation,
} from '@/domain/schema/CategoryFields.js'

export class ValidationError extends Schema.Class<ValidationError>('ValidationError')({
  field: Schema.String,
  message: Schema.String,
  value: Schema.optional(Schema.Unknown),
}) {}

export interface ValidationResult {
  readonly valid: boolean
  readonly errors: readonly ValidationError[]
}

export class ValidationFailed extends Schema.ErrorClass<ValidationFailed>('re-astr/ValidationFailed')(
  { _tag: Schema.tag('ValidationFailed'), context: Schema.String, errors: Schema.Array(ValidationError) },
  { httpApiStatus: 400 },
) {}

/** Effect-land equivalent of the old service's validateOrThrow — fails instead of throwing. */
export const validateOrFail = (result: ValidationResult, context: string): Effect.Effect<void, ValidationFailed> =>
  result.valid ? Effect.void : Effect.fail(new ValidationFailed({ context, errors: result.errors }))

// toStandardSchemaV1's `validate` can return a Promise for schemas with async
// steps — none of ours have any, so a Promise here would mean a mistake in
// how a schema was built, not bad user input. Throwing (not Effect.fail) is
// deliberate: this is a programmer error, not a validation outcome.
//
// Param is `Schema.Top` (not `Schema.Schema<unknown>`) because schemaForType/
// buildSchemaFromFields compose schemas dynamically in a loop — TS can't carry
// a precise `DecodingServices = never` through that, only the fully-erased
// `Top` view. The cast below is safe: none of our field types ever add a real
// requirement (no Effect-dependent transformations anywhere in this module).
const runValidation = (schema: Schema.Top, data: unknown): ValidationResult => {
  const result = Schema.toStandardSchemaV1(schema as unknown as Schema.ConstraintDecoder<unknown>)[
    '~standard'
  ].validate(data)
  if (result instanceof Promise) {
    throw new Error('SchemaValidation: unexpected asynchronous decode')
  }
  if (!result.issues) return { valid: true, errors: [] }

  return {
    valid: false,
    errors: result.issues.map(
      (issue) => new ValidationError({ field: (issue.path ?? []).join('.'), message: issue.message }),
    ),
  }
}

export const validateBaseSchema = (input: unknown): ValidationResult => runValidation(BaseSchema, input)

export const validateCustomFieldsSchema = (input: unknown): ValidationResult => runValidation(CustomFieldsSchema, input)

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const isUrl = Schema.makeFilter<string>(
  (input) => {
    try {
      new URL(input)
      return true
    } catch {
      return false
    }
  },
  { expected: 'a value that looks like a URL' },
)

const textFieldSchema = (validation: FieldValidation | undefined): Schema.Top => {
  if (validation?.enum) return Schema.Literals(validation.enum as [string, ...string[]])

  let schema: Schema.Schema<string> = Schema.String
  if (validation?.minLength !== undefined) schema = schema.check(Schema.isMinLength(validation.minLength))
  if (validation?.maxLength !== undefined) schema = schema.check(Schema.isMaxLength(validation.maxLength))
  if (validation?.pattern !== undefined) schema = schema.check(Schema.isPattern(new RegExp(validation.pattern)))
  return schema
}

const numberFieldSchema = (validation: FieldValidation | undefined): Schema.Top => {
  let schema: Schema.Schema<number> = Schema.Number
  if (validation?.min !== undefined) schema = schema.check(Schema.isGreaterThanOrEqualTo(validation.min))
  if (validation?.max !== undefined) schema = schema.check(Schema.isLessThanOrEqualTo(validation.max))
  return schema
}

const arrayFieldSchema = (validation: FieldValidation | undefined): Schema.Top => {
  const itemSchema = validation?.itemType ? schemaForType(validation.itemType) : Schema.Unknown
  let schema = Schema.Array(itemSchema)
  if (validation?.minItems !== undefined) schema = schema.check(Schema.isMinLength(validation.minItems))
  if (validation?.maxItems !== undefined) schema = schema.check(Schema.isMaxLength(validation.maxItems))
  return schema
}

const objectFieldSchema = (validation: FieldValidation | undefined): Schema.Top => {
  if (!validation?.properties) return Schema.Record(Schema.String, Schema.Unknown)
  return Schema.Struct(fieldsToShape(Object.values(validation.properties)))
}

/** Mirrors the old buildZodSchemaFromFields/getZodSchemaForType/applyValidationRules trio, split by type. */
const schemaForType = (type: FieldType, validation?: FieldValidation): Schema.Top => {
  switch (type) {
    case 'text':
      return textFieldSchema(validation)
    case 'number':
      return numberFieldSchema(validation)
    case 'boolean':
      return Schema.Boolean
    case 'date':
      return Schema.DateFromString
    case 'email':
      return Schema.String.check(Schema.isPattern(EMAIL_PATTERN))
    case 'url':
      return Schema.String.check(isUrl)
    case 'array':
      return arrayFieldSchema(validation)
    case 'object':
      return objectFieldSchema(validation)
  }
}

const fieldsToShape = (fields: readonly FieldDefinition[]): Record<string, Schema.Top> => {
  const shape: Record<string, Schema.Top> = {}
  for (const field of fields) {
    const fieldSchema = schemaForType(field.type, field.validation)
    shape[field.key] = field.required ? fieldSchema : Schema.optional(fieldSchema)
  }
  return shape
}

export const validateCommonData = (data: Record<string, unknown>, baseSchema: BaseSchema): ValidationResult =>
  runValidation(Schema.Struct(fieldsToShape(baseSchema.fields)), data)

const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/

const detectStringType = (value: string): FieldType => {
  if (ISO_8601_PATTERN.test(value) && !Number.isNaN(Date.parse(value))) return 'date'
  if (EMAIL_PATTERN.test(value)) return 'email'

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      new URL(value)
      return 'url'
    } catch {
      // not a valid URL after all — fall through to text
    }
  }

  return 'text'
}

export const detectValueType = (value: unknown): FieldType => {
  if (value === null || value === undefined) return 'text'
  if (Array.isArray(value)) return 'array'
  if (value instanceof Date) return 'date'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') return detectStringType(value)
  if (typeof value === 'object') return value.constructor === Object ? 'object' : 'text'
  return 'text'
}

const validateAllowCustomFields = (data: Record<string, unknown>): ValidationResult =>
  Object.keys(data).length > 0
    ? {
        valid: false,
        errors: [new ValidationError({ field: 'customData', message: 'Custom fields are not allowed for this category' })],
      }
    : { valid: true, errors: [] }

const validateMaxCustomFields = (data: Record<string, unknown>, maxCustomFields: number): ValidationResult => {
  const count = Object.keys(data).length
  return count > maxCustomFields
    ? {
        valid: false,
        errors: [
          new ValidationError({
            field: 'customData',
            message: `Maximum ${maxCustomFields} custom fields allowed, got ${count}`,
          }),
        ],
      }
    : { valid: true, errors: [] }
}

/** Fields not declared in customFieldsSchema.fields still need their runtime type checked against allowedTypes. */
const validateAdditionalFieldTypes = (
  data: Record<string, unknown>,
  customFieldsSchema: CustomFieldsSchema,
): ValidationError[] => {
  const allowedTypes = customFieldsSchema.allowedTypes
  if (!allowedTypes || allowedTypes.length === 0) return []

  const declaredKeys = new Set(customFieldsSchema.fields.map((field) => field.key))
  const errors: ValidationError[] = []

  for (const [key, value] of Object.entries(data)) {
    if (declaredKeys.has(key)) continue

    const detectedType = detectValueType(value)
    if (!allowedTypes.includes(detectedType)) {
      errors.push(
        new ValidationError({
          field: key,
          message: `Type '${detectedType}' not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          value,
        }),
      )
    }
  }

  return errors
}

export const validateCustomData = (
  data: Record<string, unknown>,
  customFieldsSchema: CustomFieldsSchema,
): ValidationResult => {
  if (!customFieldsSchema.allowCustomFields) return validateAllowCustomFields(data)

  if (customFieldsSchema.maxCustomFields !== undefined) {
    const maxFieldsResult = validateMaxCustomFields(data, customFieldsSchema.maxCustomFields)
    if (!maxFieldsResult.valid) return maxFieldsResult
  }

  const errors: ValidationError[] = []
  if (customFieldsSchema.fields.length > 0) {
    errors.push(...validateCommonData(data, { fields: customFieldsSchema.fields }).errors)
  }
  errors.push(...validateAdditionalFieldTypes(data, customFieldsSchema))

  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] }
}
