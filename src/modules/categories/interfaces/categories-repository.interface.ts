import type { Category, NewCategory } from '../../../database/schema/categories.schema';

export interface ICategoriesRepository {
  create(data: NewCategory): Promise<Category>;
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  update(id: string, data: Partial<NewCategory>): Promise<Category>;
  delete(id: string): Promise<void>;
}

export const CATEGORIES_REPOSITORY = Symbol('CATEGORIES_REPOSITORY');