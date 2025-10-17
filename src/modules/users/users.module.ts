import { DatabaseModule } from '@database/database.module'
import { Module } from '@nestjs/common'
import { AuthModule } from '@/auth/auth.module'
import { USERS_REPOSITORY } from './interfaces/users-repository.interface'
import { UsersDrizzleRepository } from './repositories/users-drizzle.repository'
import { UsersService } from './services/users.service'
import { UsersController } from './users.controller'

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: UsersDrizzleRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
