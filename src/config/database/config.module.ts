import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { DatabaseConfigService } from './config.service'
import database from './database.config'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [database],
      isGlobal: true,
      cache: true,
    }),
  ],
  providers: [ConfigService, DatabaseConfigService],
  exports: [ConfigService, DatabaseConfigService],
})
export class DatabaseConfigModule {}
