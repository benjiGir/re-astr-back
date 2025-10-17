import { faker } from '@faker-js/faker';
import type { UserRole } from '@database/schema/users.schema';

export interface UserFactoryOptions {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  emailVerified?: boolean;
}

/**
 * Factory to generate user data for E2E tests
 */
export class UserFactory {
  /**
   * Build user data with optional overrides
   */
  static build(options: UserFactoryOptions = {}): {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    emailVerified: boolean;
  } {
    return {
      name: options.name ?? faker.person.fullName(),
      email: options.email ?? faker.internet.email().toLowerCase(),
      password: options.password ?? 'Password123!', // Standardized password for tests
      role: options.role ?? 'user',
      emailVerified: options.emailVerified ?? true,
    };
  }

  /**
   * Build multiple users at once
   */
  static buildMany(count: number, options: UserFactoryOptions = {}): ReturnType<typeof UserFactory.build>[] {
    return Array.from({ length: count }, () => UserFactory.build(options));
  }

  /**
   * Build a user with master role
   */
  static buildMaster(options: Omit<UserFactoryOptions, 'role'> = {}): ReturnType<typeof UserFactory.build> {
    return UserFactory.build({ ...options, role: 'master' });
  }

  /**
   * Build a user with archivist role
   */
  static buildArchivist(options: Omit<UserFactoryOptions, 'role'> = {}): ReturnType<typeof UserFactory.build> {
    return UserFactory.build({ ...options, role: 'archivist' });
  }

  /**
   * Build a user with contributor role
   */
  static buildContributor(options: Omit<UserFactoryOptions, 'role'> = {}): ReturnType<typeof UserFactory.build> {
    return UserFactory.build({ ...options, role: 'contributor' });
  }

  /**
   * Build a user with user role (default)
   */
  static buildUser(options: Omit<UserFactoryOptions, 'role'> = {}): ReturnType<typeof UserFactory.build> {
    return UserFactory.build({ ...options, role: 'user' });
  }
}