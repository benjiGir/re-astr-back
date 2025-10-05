import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '@database/database.service';
import { categories, type Category, type NewCategory } from '@database/schema/categories.schema';
import type { ICategoriesRepository } from '@modules/categories/interfaces/categories-repository.interface';

@Injectable()
export class CategoriesDrizzleRepository implements ICategoriesRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: NewCategory): Promise<Category> {
    const [category] = await this.db.drizzle
      .insert(categories)
      .values(data)
      .returning();

    return category;
  }

  async findAll(): Promise<Category[]> {
    return this.db.drizzle.select().from(categories);
  }

  async findById(id: string): Promise<Category | null> {
    const [category] = await this.db.drizzle
      .select()
      .from(categories)
      .where(eq(categories.id, id));

    return category || null;
  }

  async update(id: string, data: Partial<NewCategory>): Promise<Category> {
    const [updatedCategory] = await this.db.drizzle
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();

    return updatedCategory;
  }

  async delete(id: string): Promise<void> {
    await this.db.drizzle.delete(categories).where(eq(categories.id, id));
  }
}