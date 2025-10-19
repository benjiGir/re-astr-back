import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DatabaseService, type NewTest, type Test, tests } from '@/database'
import type { ITestsRepository } from '../interfaces/tests-repository.interface'

@Injectable()
export class TestsDrizzleRepository implements ITestsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: NewTest): Promise<Test> {
    const [test] = await this.db.drizzle.insert(tests).values(data).returning()

    return test
  }

  async findAll(): Promise<Test[]> {
    return this.db.drizzle.select().from(tests)
  }

  async findById(id: string): Promise<Test | null> {
    const [test] = await this.db.drizzle.select().from(tests).where(eq(tests.id, id))

    return test || null
  }

  async findByCategory(categoryId: string): Promise<Test[]> {
    return this.db.drizzle.select().from(tests).where(eq(tests.categoryId, categoryId))
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
