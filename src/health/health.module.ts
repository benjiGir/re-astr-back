import { DatabaseModule } from '@database/database.module'
import { Module } from '@nestjs/common'
import { MinioModule } from '@/storage/minio/minio.module'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'

@Module({
  imports: [DatabaseModule, MinioModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
