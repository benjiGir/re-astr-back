import { INestApplication } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { users } from '@database/schema';
import type { UserRole } from '@database/schema/users.schema';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Create a user directly in the database (no auth needed)
 * For E2E testing we bypass authentication completely
 */
export async function createTestUser(
  app: INestApplication,
  userData: {
    name: string;
    email: string;
    role: UserRole;
  },
): Promise<TestUser> {
  const databaseService = app.get(DatabaseService);
  const db = databaseService.getDatabase();

  const [user] = await db
    .insert(users)
    .values({
      name: userData.name,
      email: userData.email,
      role: userData.role,
      emailVerified: true,
    })
    .returning();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}