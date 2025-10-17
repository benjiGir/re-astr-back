import { forwardRef, Module } from '@nestjs/common'
import { AuthModule } from '@/auth/auth.module'
import { DatabaseModule } from '../../../database/database.module'
import { TestsModule } from '../tests.module'
import { TEST_FILES_REPOSITORY } from './interfaces/test-files-repository.interface'
import { TestFilesDrizzleRepository } from './repositories/test-files-drizzle.repository'
import { TestFilesController } from './test-files.controller'
import { TestFilesService } from './test-files.service'

@Module({
  imports: [DatabaseModule, AuthModule, forwardRef(() => TestsModule)],
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
