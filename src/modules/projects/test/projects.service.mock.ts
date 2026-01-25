import type { Project } from '@database/schema/projects.schema'

export const mockProject: Project = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Avionics System Validation',
  description: 'Comprehensive testing program for next-generation avionics components',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockProjectWithoutDescription: Project = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  name: 'Automotive Safety Testing',
  description: null,
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
}

export const mockProjectMedical: Project = {
  id: '323e4567-e89b-12d3-a456-426614174002',
  name: 'Medical Device Certification',
  description: 'FDA compliance testing for medical monitoring devices',
  createdAt: new Date('2024-01-03'),
  updatedAt: new Date('2024-01-03'),
}

export const mockProjects: Project[] = [
  mockProject,
  mockProjectWithoutDescription,
  mockProjectMedical,
]
