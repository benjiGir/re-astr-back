import type { NewTest, Test } from '../../../database/schema/tests.schema'

export type TestWithAuthor = Test & { createdByName?: string | null }

export interface TestFilters {
  categoryId?: string
  projectId?: string
  status?: Test['status']
}

export interface ITestsRepository {
  create(data: NewTest): Promise<Test>
  findAll(filters?: TestFilters): Promise<TestWithAuthor[]>
  findById(id: string): Promise<TestWithAuthor | null>
  update(id: string, data: Partial<NewTest>): Promise<Test>
  delete(id: string): Promise<void>
}

export const TESTS_REPOSITORY = Symbol('TESTS_REPOSITORY')
