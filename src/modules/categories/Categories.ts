import { Schema } from 'effect'
import { BaseSchema, CustomFieldsSchema } from '@/domain/schema/CategoryFields.js'

export class Category extends Schema.Class<Category>('Category')({
  id: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  baseSchema: BaseSchema,
  customFieldsSchema: CustomFieldsSchema,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
}) {}

export class CreateCategory extends Schema.Class<CreateCategory>('CreateCategory')({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  baseSchema: BaseSchema,
  customFieldsSchema: Schema.optional(CustomFieldsSchema),
}) {}

export class UpdateCategory extends Schema.Class<UpdateCategory>('UpdateCategory')({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  baseSchema: Schema.optional(BaseSchema),
  customFieldsSchema: Schema.optional(CustomFieldsSchema),
}) {}

export class CategoryNotFound extends Schema.TaggedError<CategoryNotFound>(
  're-astr/CategoryNotFound',
)('CategoryNotFound', { id: Schema.String }, { httpApiStatus: 404 }) {}

/** Mirrors ProjectHasTests: tests.categoryId also has onDelete: 'restrict'. */
export class CategoryHasTests extends Schema.TaggedError<CategoryHasTests>(
  're-astr/CategoryHasTests',
)('CategoryHasTests', { id: Schema.String }, { httpApiStatus: 409 }) {}
