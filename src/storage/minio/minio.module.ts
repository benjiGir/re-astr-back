import { Global, Module } from '@nestjs/common';
import { MinioService } from './minio.service';
import { MinioConfigModule } from '@config/minio/config.module';

@Global()
@Module({
  imports: [MinioConfigModule],
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}