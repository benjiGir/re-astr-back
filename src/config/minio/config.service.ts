import { Injectable } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'

@Injectable()
export class MinioConfigService {
  constructor(private configService: ConfigService) {}

  get endPoint(): string {
    return this.configService.get<string>('minio.endPoint')!
  }

  get port(): number {
    return this.configService.get<number>('minio.port')!
  }

  get useSSL(): boolean {
    return this.configService.get<boolean>('minio.useSSL')!
  }

  get accessKey(): string {
    return this.configService.get<string>('minio.accessKey')!
  }

  get secretKey(): string {
    return this.configService.get<string>('minio.secretKey')!
  }

  get defaultBucket(): string {
    return this.configService.get<string>('minio.defaultBucket')!
  }
}
