import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioConfigService } from './config.service';
import minioConfig from './minio.config';

@Module({
  imports: [ConfigModule.forFeature(minioConfig)],
  providers: [MinioConfigService],
  exports: [MinioConfigService],
})
export class MinioConfigModule {}