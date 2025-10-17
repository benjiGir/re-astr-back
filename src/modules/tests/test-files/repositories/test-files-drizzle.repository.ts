import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { DatabaseService } from '../../../../database/database.service'
import {
  type NewTestFile,
  type TestFile,
  testFiles,
} from '../../../../database/schema/test-files.schema'
import type { ITestFilesRepository } from '../interfaces/test-files-repository.interface'

@Injectable()
export class TestFilesDrizzleRepository implements ITestFilesRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: NewTestFile): Promise<TestFile> {
    const [testFile] = await this.db.drizzle.insert(testFiles).values(data).returning()

    return testFile
  }

  async findAll(): Promise<TestFile[]> {
    return this.db.drizzle.select().from(testFiles)
  }

  async findById(id: string): Promise<TestFile | null> {
    const [testFile] = await this.db.drizzle.select().from(testFiles).where(eq(testFiles.id, id))

    return testFile || null
  }

  async findByTest(testId: string): Promise<TestFile[]> {
    return this.db.drizzle.select().from(testFiles).where(eq(testFiles.testId, testId))
  }

  async update(id: string, data: Partial<NewTestFile>): Promise<TestFile> {
    const [updatedTestFile] = await this.db.drizzle
      .update(testFiles)
      .set(data)
      .where(eq(testFiles.id, id))
      .returning()

    return updatedTestFile
  }

  async delete(id: string): Promise<void> {
    await this.db.drizzle.delete(testFiles).where(eq(testFiles.id, id))
  }
}
