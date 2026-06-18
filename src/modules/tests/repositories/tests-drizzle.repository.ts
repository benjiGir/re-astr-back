import { DatabaseService } from '@database/database.service'
import { NewTest, Test, tests } from '@database/schema/tests.schema'
import { users } from '@database/schema/users.schema'
import { Injectable } from '@nestjs/common'
import { and, eq, getTableColumns } from 'drizzle-orm'
import type {
  ITestsRepository,
  TestFilters,
  TestWithAuthor,
} from '../interfaces/tests-repository.interface'

@Injectable()
export class TestsDrizzleRepository implements ITestsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: NewTest): Promise<Test> {
    const [test] = await this.db.drizzle.insert(tests).values(data).returning()

    return test
  }

  async findAll(filters?: TestFilters): Promise<TestWithAuthor[]> {
    const conditions = []
    if (filters?.categoryId) conditions.push(eq(tests.categoryId, filters.categoryId))
    if (filters?.projectId) conditions.push(eq(tests.projectId, filters.projectId))
    if (filters?.status) conditions.push(eq(tests.status, filters.status))

    return this.db.drizzle
      .select({ ...getTableColumns(tests), createdByName: users.name })
      .from(tests)
      .leftJoin(users, eq(tests.createdBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
  }

  async findById(id: string): Promise<TestWithAuthor | null> {
    const [test] = await this.db.drizzle
      .select({ ...getTableColumns(tests), createdByName: users.name })
      .from(tests)
      .leftJoin(users, eq(tests.createdBy, users.id))
      .where(eq(tests.id, id))

    return test || null
  }

  async update(id: string, data: Partial<NewTest>): Promise<Test> {
    const [updatedTest] = await this.db.drizzle
      .update(tests)
      .set(data)
      .where(eq(tests.id, id))
      .returning()

    return updatedTest
  }

  async delete(id: string): Promise<void> {
    await this.db.drizzle.delete(tests).where(eq(tests.id, id))
  }
}
