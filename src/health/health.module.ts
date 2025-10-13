import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseModule } from '@database/database.module';
import { MinioModule } from '@/storage/minio/minio.module';

@Module({
  imports: [DatabaseModule, MinioModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}