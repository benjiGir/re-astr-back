import type { NewTest, Test } from '../../../database/schema/tests.schema'

export type TestWithAuthor = Test & { createdByName?: string | null }

export interface TestSearchFilters {
  categoryId?: string
  projectId?: string
  status?: Test['status']
  search?: string
}

export interface ITestsRepository {
  create(data: NewTest): Promise<Test>
  findAll(): Promise<TestWithAuthor[]>
  findById(id: string): Promise<TestWithAuthor | null>
  search(filters: TestSearchFilters): Promise<TestWithAuthor[]>
  update(id: string, data: Partial<NewTest>): Promise<Test>
  delete(id: string): Promise<void>
}

export const TESTS_REPOSITORY = Symbol('TESTS_REPOSITORY')
