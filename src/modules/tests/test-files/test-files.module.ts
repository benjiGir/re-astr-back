import { Module, forwardRef } from '@nestjs/common';
import { TestFilesService } from './test-files.service';
import { TestFilesController } from './test-files.controller';
import { TestFilesDrizzleRepository } from './repositories/test-files-drizzle.repository';
import { TEST_FILES_REPOSITORY } from './interfaces/test-files-repository.interface';
import { DatabaseModule } from '../../../database/database.module';
import { TestsModule } from '../tests.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => TestsModule)],
  controllers: [TestFilesController],
  providers: [
    TestFilesService,
    {
      provide: TEST_FILES_REPOSITORY,
      useClass: TestFilesDrizzleRepository,
    },
  ],
  exports: [TestFilesService],
})
export class TestFilesModule {}