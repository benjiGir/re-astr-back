import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import appConfiguration from './app-configuration'
import { AppConfigService } from './config.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfiguration],
      isGlobal: true,
      cache: true,
    }),
  ],
  providers: [AppConfigService, ConfigService],
  exports: [AppConfigService, ConfigService],
})
export class AppConfigModule {}
