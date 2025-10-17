import type { User, UserRole } from '@database/schema/users.schema'

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY')

export interface IUsersRepository {
  findAll(): Promise<User[]>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  update(id: string, data: Partial<User>): Promise<User | null>
  assignRole(id: string, role: UserRole): Promise<User | null>
  delete(id: string): Promise<void>
}
