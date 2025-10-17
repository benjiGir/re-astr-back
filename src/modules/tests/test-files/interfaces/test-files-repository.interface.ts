import type { NewTestFile, TestFile } from '../../../../database/schema/test-files.schema'

export interface ITestFilesRepository {
  create(data: NewTestFile): Promise<TestFile>
  findAll(): Promise<TestFile[]>
  findById(id: string): Promise<TestFile | null>
  findByTest(testId: string): Promise<TestFile[]>
  update(id: string, data: Partial<NewTestFile>): Promise<TestFile>
  delete(id: string): Promise<void>
}

export const TEST_FILES_REPOSITORY = Symbol('TEST_FILES_REPOSITORY')
