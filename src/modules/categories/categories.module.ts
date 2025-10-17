import { DatabaseModule } from '@database/database.module'
import { CategoriesController } from '@modules/categories/categories.controller'
import { CATEGORIES_REPOSITORY } from '@modules/categories/interfaces/categories-repository.interface'
import { CategoriesDrizzleRepository } from '@modules/categories/repositories/categories-drizzle.repository'
import { CategoriesService } from '@modules/categories/services/categories.service'
import { Module } from '@nestjs/common'
import { AuthModule } from '@/auth/auth.module'

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
