import { DatabaseConfigModule } from '@config/database/config.module'
import { DatabaseService } from '@database/database.service'
import { Global, Module } from '@nestjs/common'

@Global()
@Module({
  imports: [DatabaseConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
