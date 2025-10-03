import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

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
}
