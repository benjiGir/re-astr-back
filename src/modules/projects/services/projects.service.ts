import { LoggerService } from '@common/logger/logger.service'
import type { CreateProjectDto } from '@modules/projects/dto/create-project.dto'
import type { UpdateProjectDto } from '@modules/projects/dto/update-project.dto'
import {
  PROJECTS_REPOSITORY,
  type IProjectsRepository,
} from '@modules/projects/interfaces/projects-repository.interface'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PROJECTS_REPOSITORY)
    private readonly projectsRepository: IProjectsRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ProjectsService.name)
  }

  async create(createProjectDto: CreateProjectDto) {
    this.logger.info({ name: createProjectDto.name }, 'Creating new project')

    const project = await this.projectsRepository.create({
      name: createProjectDto.name,
      description: createProjectDto.description,
    })

    this.logger.info(
      { projectId: project.id, name: project.name },
      'Project created successfully',
    )
    return project
  }

  async findAll() {
    return this.projectsRepository.findAll()
  }

  async findOne(id: string) {
    const project = await this.projectsRepository.findById(id)

    if (!project) {
      this.logger.warn({ projectId: id }, 'Project not found')
      throw new NotFoundException(`Project with ID ${id} not found`)
    }

    return project
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    this.logger.info({ projectId: id }, 'Updating project')

    await this.findOne(id)

    const updated = await this.projectsRepository.update(id, {
      name: updateProjectDto.name,
      description: updateProjectDto.description,
    })

    this.logger.info({ projectId: id, name: updated.name }, 'Project updated successfully')
    return updated
  }

  async remove(id: string) {
    this.logger.info({ projectId: id }, 'Deleting project')

    await this.findOne(id)
    await this.projectsRepository.delete(id)

    this.logger.info({ projectId: id }, 'Project deleted successfully')
    return { message: `Project with ID ${id} has been deleted` }
  }
}