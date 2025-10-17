import { AppConfigModule } from '@config/app/config.module'
import { DatabaseConfigModule } from '@config/database/config.module'
import { Module } from '@nestjs/common'
import { AuthController } from '@/auth/auth.controller'
import { AuthService } from '@/auth/auth.service'
import { AuthGuard } from '@/auth/guards/auth.guard'
import { RequestConverterService } from '@/auth/services/request-converter.service'
import { ResponseHandlerService } from '@/auth/services/response-handler.service'

@Module({
  imports: [AppConfigModule, DatabaseConfigModule],
  providers: [AuthService, AuthGuard, RequestConverterService, ResponseHandlerService],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
