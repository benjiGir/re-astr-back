import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get env(): string {
    return this.configService.get<string>('app.env')
  }

  get host(): string {
    return this.configService.get<string>('app.host')
  }

  get dbUser(): string {
    return this.configService.get<string>('app.dbUser')
  }

  get dbPassword(): string {
    const pass = this.configService.get<string>('app.dbPassword')
    console.log(pass)
    return pass
  }

  get dbName(): string {
    return this.configService.get<string>('app.dbName')
  }

  get port(): number {
    return this.configService.get('app.port')
  }
}
