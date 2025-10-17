import { Global, Module } from '@nestjs/common'
import { SchemaValidationService } from './schema-validation.service'

@Global()
@Module({
  providers: [SchemaValidationService],
  exports: [SchemaValidationService],
})
export class ValidationModule {}
