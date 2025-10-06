import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { IUsersRepository } from '../interfaces/users-repository.interface';
import type { User, UserRole } from '@database/schema/users.schema';
import { users } from '@database/schema/users.schema';
import {DatabaseService} from "@/database";

@Injectable()
export class UsersDrizzleRepository implements IUsersRepository {
  constructor(
    private readonly db: DatabaseService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.db.drizzle.select().from(users);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.drizzle.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.drizzle
      .select()
      .from(users)
      .where(eq(users.email, email));
    return result[0] || null;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const result = await this.db.drizzle
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return result[0] || null;
  }

  async assignRole(id: string, role: UserRole): Promise<User | null> {
    const result = await this.db.drizzle
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return result[0] || null;
  }

  async delete(id: string): Promise<void> {
    await this.db.drizzle.delete(users).where(eq(users.id, id));
  }
}