import { DatabaseModule } from '@database/database.module'
import { CategoriesModule } from '@modules/categories/categories.module'
import { TESTS_REPOSITORY } from '@modules/tests/interfaces/tests-repository.interface'
import { TestsDrizzleRepository } from '@modules/tests/repositories/tests-drizzle.repository'
import { TestFilesModule } from '@modules/tests/test-files/test-files.module'
import { TestsController } from '@modules/tests/tests.controller'
import { TestsService } from '@modules/tests/tests.service'
import { forwardRef, Module } from '@nestjs/common'
import { AuthModule } from '@/auth/auth.module'

@Module({
  imports: [DatabaseModule, AuthModule, CategoriesModule, forwardRef(() => TestFilesModule)],
  controllers: [TestsController],
  providers: [
    TestsService,
    {
      provide: TESTS_REPOSITORY,
      useClass: TestsDrizzleRepository,
    },
  ],
  exports: [TestsService],
})
export class TestsModule {}
