import { Global, Module } from '@nestjs/common'
import { DatabaseService } from '@database/database.service'
import {DatabaseConfigModule} from "@config/database/config.module";

@Global()
@Module({
  imports: [DatabaseConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}