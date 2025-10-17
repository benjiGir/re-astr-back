import type { DatabaseService } from '@database/database.service'
import { Injectable } from '@nestjs/common'
import type { PinoLogger } from 'nestjs-pino'
import type { MinioService } from '@/storage/minio/minio.service'

export interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
}

export interface ReadinessStatus {
  status: 'ready' | 'not_ready'
  timestamp: string
  services: {
    database: ServiceStatus
    storage: ServiceStatus
  }
}

export interface ServiceStatus {
  status: 'up' | 'down'
  message?: string
  responseTime?: number
}

@Injectable()
export class HealthService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly databaseService: DatabaseService,
    private readonly minioService: MinioService,
  ) {
    this.logger.setContext(HealthService.name)
  }

  getHealth(): HealthStatus {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }

  async getReadiness(): Promise<ReadinessStatus> {
    const [databaseStatus, storageStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
    ])

    const isReady = databaseStatus.status === 'up' && storageStatus.status === 'up'

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: {
        database: databaseStatus,
        storage: storageStatus,
      },
    }
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const startTime = Date.now()

    try {
      const db = this.databaseService.getDatabase()
      await db.execute('SELECT 1')

      const responseTime = Date.now() - startTime

      this.logger.debug({ responseTime }, 'Database health check passed')

      return {
        status: 'up',
        responseTime,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
        },
        'Database health check failed',
      )

      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      }
    }
  }

  private async checkStorage(): Promise<ServiceStatus> {
    const startTime = Date.now()

    try {
      const client = this.minioService.getClient()
      await client.listBuckets()

      const responseTime = Date.now() - startTime

      this.logger.debug({ responseTime }, 'MinIO health check passed')

      return {
        status: 'up',
        responseTime,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
        },
        'MinIO health check failed',
      )

      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      }
    }
  }
}
