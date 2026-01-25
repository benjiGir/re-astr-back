import { LoggerService } from '@common/logger/logger.service'
import { NotFoundException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type { CreateProjectDto } from '../dto/create-project.dto'
import type { UpdateProjectDto } from '../dto/update-project.dto'
import {
  type IProjectsRepository,
  PROJECTS_REPOSITORY,
} from '../interfaces/projects-repository.interface'
import { ProjectsService } from '../services/projects.service'
import { mockProject, mockProjects } from './projects.service.mock'

describe('ProjectsService', () => {
  let service: ProjectsService
  let repository: IProjectsRepository
  let logger: LoggerService

  const mockRepository: IProjectsRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PROJECTS_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile()

    service = module.get<ProjectsService>(ProjectsService)
    repository = module.get<IProjectsRepository>(PROJECTS_REPOSITORY)
    logger = module.get<LoggerService>(LoggerService)

    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should set logger context on initialization', () => {
    expect(logger.setContext).toHaveBeenCalledWith(ProjectsService.name)
  })

  describe('create', () => {
    const createProjectDto: CreateProjectDto = {
      name: 'New Project',
      description: 'Project description',
    }

    it('should create a project successfully', async () => {
      // Arrange
      jest.spyOn(repository, 'create').mockResolvedValue(mockProject)

      // Act
      const result = await service.create(createProjectDto)

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        { name: createProjectDto.name },
        'Creating new project',
      )
      expect(repository.create).toHaveBeenCalledWith({
        name: createProjectDto.name,
        description: createProjectDto.description,
      })
      expect(logger.info).toHaveBeenCalledWith(
        { projectId: mockProject.id, name: mockProject.name },
        'Project created successfully',
      )
      expect(result).toEqual(mockProject)
    })

    it('should create a project without description', async () => {
      // Arrange
      const dtoWithoutDescription: CreateProjectDto = {
        name: 'Project without description',
      }
      const projectWithoutDescription = { ...mockProject, description: null }

      jest.spyOn(repository, 'create').mockResolvedValue(projectWithoutDescription)

      // Act
      const result = await service.create(dtoWithoutDescription)

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        name: dtoWithoutDescription.name,
        description: undefined,
      })
      expect(result).toEqual(projectWithoutDescription)
    })

    it('should log project creation attempt', async () => {
      // Arrange
      jest.spyOn(repository, 'create').mockResolvedValue(mockProject)

      // Act
      await service.create(createProjectDto)

      // Assert
      expect(logger.info).toHaveBeenCalledTimes(2) // Once for creating, once for success
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        { name: createProjectDto.name },
        'Creating new project',
      )
    })
  })

  describe('findAll', () => {
    it('should return an array of projects', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue(mockProjects)

      // Act
      const result = await service.findAll()

      // Assert
      expect(repository.findAll).toHaveBeenCalled()
      expect(result).toEqual(mockProjects)
      expect(result).toHaveLength(3)
    })

    it('should return an empty array when no projects exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue([])

      // Act
      const result = await service.findAll()

      // Assert
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })
  })

  describe('findOne', () => {
    it('should return a project when found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockProject)

      // Act
      const result = await service.findOne(mockProject.id)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith(mockProject.id)
      expect(result).toEqual(mockProject)
    })

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id'
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.findOne(nonExistentId)).rejects.toThrow(NotFoundException)
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        `Project with ID ${nonExistentId} not found`,
      )
    })

    it('should log warning when project not found', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id'
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act
      try {
        await service.findOne(nonExistentId)
      } catch {
        // Expected error
      }

      // Assert
      expect(logger.warn).toHaveBeenCalledWith({ projectId: nonExistentId }, 'Project not found')
    })
  })

  describe('update', () => {
    const updateProjectDto: UpdateProjectDto = {
      name: 'Updated Project Name',
      description: 'Updated description',
    }

    it('should update a project successfully', async () => {
      // Arrange
      const updatedProject = { ...mockProject, ...updateProjectDto }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockProject)
      jest.spyOn(repository, 'update').mockResolvedValue(updatedProject)

      // Act
      const result = await service.update(mockProject.id, updateProjectDto)

      // Assert
      expect(logger.info).toHaveBeenCalledWith({ projectId: mockProject.id }, 'Updating project')
      expect(repository.findById).toHaveBeenCalledWith(mockProject.id)
      expect(repository.update).toHaveBeenCalledWith(mockProject.id, {
        name: updateProjectDto.name,
        description: updateProjectDto.description,
      })
      expect(logger.info).toHaveBeenCalledWith(
        { projectId: mockProject.id, name: updatedProject.name },
        'Project updated successfully',
      )
      expect(result).toEqual(updatedProject)
    })

    it('should throw NotFoundException when project does not exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.update('non-existent-id', updateProjectDto)).rejects.toThrow(
        NotFoundException,
      )
      expect(repository.update).not.toHaveBeenCalled()
    })

    it('should update only the name', async () => {
      // Arrange
      const partialUpdate: UpdateProjectDto = { name: 'New Name Only' }
      const updatedProject = { ...mockProject, name: partialUpdate.name }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockProject)
      jest.spyOn(repository, 'update').mockResolvedValue(updatedProject)

      // Act
      const result = await service.update(mockProject.id, partialUpdate)

      // Assert
      expect(repository.update).toHaveBeenCalledWith(mockProject.id, {
        name: partialUpdate.name,
        description: undefined,
      })
      expect(result).toEqual(updatedProject)
    })

    it('should update only the description', async () => {
      // Arrange
      const partialUpdate: UpdateProjectDto = { description: 'New Description Only' }
      const updatedProject = { ...mockProject, description: partialUpdate.description }

      jest.spyOn(repository, 'findById').mockResolvedValue(mockProject)
      jest.spyOn(repository, 'update').mockResolvedValue(updatedProject)

      // Act
      const result = await service.update(mockProject.id, partialUpdate)

      // Assert
      expect(repository.update).toHaveBeenCalledWith(mockProject.id, {
        name: undefined,
        description: partialUpdate.description,
      })
      expect(result).toEqual(updatedProject)
    })
  })

  describe('remove', () => {
    it('should delete a project successfully', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockProject)
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined)

      // Act
      const result = await service.remove(mockProject.id)

      // Assert
      expect(logger.info).toHaveBeenCalledWith({ projectId: mockProject.id }, 'Deleting project')
      expect(repository.findById).toHaveBeenCalledWith(mockProject.id)
      expect(repository.delete).toHaveBeenCalledWith(mockProject.id)
      expect(logger.info).toHaveBeenCalledWith(
        { projectId: mockProject.id },
        'Project deleted successfully',
      )
      expect(result).toEqual({ message: `Project with ID ${mockProject.id} has been deleted` })
    })

    it('should throw NotFoundException when project to delete does not exist', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null)

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException)
      expect(repository.delete).not.toHaveBeenCalled()
    })

    it('should verify project exists before deletion', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockProject)
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined)

      // Act
      await service.remove(mockProject.id)

      // Assert
      expect(repository.findById).toHaveBeenCalledBefore(repository.delete as jest.Mock)
    })
  })
})
