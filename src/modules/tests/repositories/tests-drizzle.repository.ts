import { DatabaseService } from '@database/database.service'
import { NewTest, Test, tests } from '@database/schema/tests.schema'
import { users } from '@database/schema/users.schema'
import { Injectable } from '@nestjs/common'
import { and, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm'
import type {
  ITestsRepository,
  TestSearchFilters,
  TestWithAuthor,
} from '../interfaces/tests-repository.interface'

@Injectable()
export class TestsDrizzleRepository implements ITestsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: NewTest): Promise<Test> {
    const [test] = await this.db.drizzle.insert(tests).values(data).returning()

    return test
  }

  private selectWithAuthor() {
    return this.db.drizzle
      .select({ ...getTableColumns(tests), createdByName: users.name })
      .from(tests)
      .leftJoin(users, eq(tests.createdBy, users.id))
  }

  async findAll(): Promise<TestWithAuthor[]> {
    return this.selectWithAuthor()
  }

  async findById(id: string): Promise<TestWithAuthor | null> {
    const [test] = await this.selectWithAuthor().where(eq(tests.id, id))

    return test || null
  }

  async search(filters: TestSearchFilters): Promise<TestWithAuthor[]> {
    const conditions = []
    if (filters.categoryId) conditions.push(eq(tests.categoryId, filters.categoryId))
    if (filters.projectId) conditions.push(eq(tests.projectId, filters.projectId))
    if (filters.status) conditions.push(eq(tests.status, filters.status))

    if (filters.search) {
      const escaped = filters.search.replace(/[\\%_]/g, '\\$&')
      const term = `%${escaped}%`
      conditions.push(
        or(
          ilike(tests.name, term),
          ilike(tests.description, term),
          ilike(users.name, term),
          sql`${tests.metadata}->>'author' ILIKE ${term}`,
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(
              CASE WHEN jsonb_typeof(${tests.metadata}->'tags') = 'array'
                THEN ${tests.metadata}->'tags'
                ELSE '[]'::jsonb
              END
            ) AS tag
            WHERE tag ILIKE ${term}
          )`,
        ),
      )
    }

    return this.selectWithAuthor().where(conditions.length > 0 ? and(...conditions) : undefined)
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
