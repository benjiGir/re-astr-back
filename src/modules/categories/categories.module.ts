import { Module } from '@nestjs/common';
import { CategoriesService } from '@modules/categories/services/categories.service';
import { CategoriesController } from '@modules/categories/categories.controller';
import { CategoriesDrizzleRepository } from '@modules/categories/repositories/categories-drizzle.repository';
import { CATEGORIES_REPOSITORY } from '@modules/categories/interfaces/categories-repository.interface';
import { DatabaseModule } from '@database/database.module';
import {AuthModule} from "@/auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    {
      provide: CATEGORIES_REPOSITORY,
      useClass: CategoriesDrizzleRepository,
    },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}