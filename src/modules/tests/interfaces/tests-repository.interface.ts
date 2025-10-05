import type { Test, NewTest } from '../../../database/schema/tests.schema';

export interface ITestsRepository {
  create(data: NewTest): Promise<Test>;
  findAll(): Promise<Test[]>;
  findById(id: string): Promise<Test | null>;
  findByCategory(categoryId: string): Promise<Test[]>;
  update(id: string, data: Partial<NewTest>): Promise<Test>;
  delete(id: string): Promise<void>;
}

export const TESTS_REPOSITORY = Symbol('TESTS_REPOSITORY');