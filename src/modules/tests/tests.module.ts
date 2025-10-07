import { Module, forwardRef } from '@nestjs/common';
import { TestsService } from '@modules/tests/tests.service';
import { TestsController } from '@modules/tests/tests.controller';
import { TestsDrizzleRepository } from '@modules/tests/repositories/tests-drizzle.repository';
import { TESTS_REPOSITORY } from '@modules/tests/interfaces/tests-repository.interface';
import { DatabaseModule } from '@database/database.module';
import { CategoriesModule } from '@modules/categories/categories.module';
import { TestFilesModule } from '@modules/tests/test-files/test-files.module';
import {AuthModule} from "@/auth/auth.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    forwardRef(() => TestFilesModule),
  ],
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