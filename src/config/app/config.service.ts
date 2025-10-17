import { Injectable } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get env(): string {
    return <string>this.configService.get('app.env')
  }

  get port(): number {
    return <number>this.configService.get('app.port')
  }

  get betterAuthSecret(): string {
    return <string>this.configService.get('app.betterAuthSecret')
  }

  get cookieSecret(): string {
    return <string>this.configService.get('app.cookieSecret')
  }

  get baseUrl(): string {
    return <string>this.configService.get('app.baseUrl')
  }

  get sessionExpiresIn(): number {
    return <number>this.configService.get('app.sessionExpiresIn')
  }

  get sessionUpdateAge(): number {
    return <number>this.configService.get('app.sessionUpdateAge')
  }

  get emailPasswordEnabled(): boolean {
    return <boolean>this.configService.get('app.emailPasswordEnabled')
  }

  get emailPasswordRequireEmailVerification(): boolean {
    return <boolean>this.configService.get('app.emailPasswordRequireEmailVerification')
  }
}
