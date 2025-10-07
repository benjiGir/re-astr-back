import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { UsersController } from './users.controller';
import { UsersDrizzleRepository } from './repositories/users-drizzle.repository';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { DatabaseModule } from '@database/database.module';
import {AuthModule} from "@/auth/auth.module";

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