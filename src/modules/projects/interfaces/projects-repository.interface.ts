import type { NewProject, Project } from '@database/schema/projects.schema'

export interface IProjectsRepository {
  create(data: NewProject): Promise<Project>
  findAll(): Promise<Project[]>
  findById(id: string): Promise<Project | null>
  update(id: string, data: Partial<NewProject>): Promise<Project>
  delete(id: string): Promise<void>
}

export const PROJECTS_REPOSITORY = Symbol('PROJECTS_REPOSITORY')