import { Schema } from 'effect'

export class Project extends Schema.Class<Project>('Project')({
  id: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
}) {}

export class CreateProject extends Schema.Class<CreateProject>('CreateProject')({
  name: Schema.String,
  description: Schema.optional(Schema.String),
}) {}

export class UpdateProject extends Schema.Class<UpdateProject>('UpdateProject')({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
}) {}

export class ProjectNotFound extends Schema.ErrorClass<ProjectNotFound>('re-astr/ProjectNotFound')(
  { _tag: Schema.tag('ProjectNotFound'), id: Schema.String },
  { httpApiStatus: 404 },
) {}

export class ProjectNameConflict extends Schema.ErrorClass<ProjectNameConflict>('re-astr/ProjectNameConflict')(
  { _tag: Schema.tag('ProjectNameConflict'), name: Schema.String },
  { httpApiStatus: 409 },
) {}

/** Fixes Faille #5: delete used to surface the raw FK-restrict violation as a 500. */
export class ProjectHasTests extends Schema.ErrorClass<ProjectHasTests>('re-astr/ProjectHasTests')(
  { _tag: Schema.tag('ProjectHasTests'), id: Schema.String },
  { httpApiStatus: 409 },
) {}
