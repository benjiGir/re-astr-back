import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseService } from './database.service'
import databaseConfig from '../config/database/database.config'
import {DatabaseConfigModule} from "../config/database/config.module";

@Global()
@Module({
  imports: [DatabaseConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}