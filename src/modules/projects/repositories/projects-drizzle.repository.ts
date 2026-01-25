import { DatabaseService } from '@database/database.service'
import { type NewProject, type Project, projects } from '@database/schema/projects.schema'
import type { IProjectsRepository } from '@modules/projects/interfaces/projects-repository.interface'
import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

@Injectable()
export class ProjectsDrizzleRepository implements IProjectsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: NewProject): Promise<Project> {
    const [project] = await this.db.drizzle.insert(projects).values(data).returning()

    return project
  }

  async findAll(): Promise<Project[]> {
    return this.db.drizzle.select().from(projects)
  }

  async findById(id: string): Promise<Project | null> {
    const [project] = await this.db.drizzle.select().from(projects).where(eq(projects.id, id))

    return project || null
  }

  async update(id: string, data: Partial<NewProject>): Promise<Project> {
    const [updatedProject] = await this.db.drizzle
      .update(projects)
      .set(data)
      .where(eq(projects.id, id))
      .returning()

    return updatedProject
  }

  async delete(id: string): Promise<void> {
    await this.db.drizzle.delete(projects).where(eq(projects.id, id))
  }
}