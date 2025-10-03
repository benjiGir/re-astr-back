import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { TestController } from './test.controller'
import { AuthGuard } from './guards/auth.guard'
import { RequestConverterService } from './services/request-converter.service'
import { ResponseHandlerService } from './services/response-handler.service'
import {AppConfigModule} from "../config/app/config.module";
import {DatabaseConfigModule} from "../config/database/config.module";

@Module({
  imports: [AppConfigModule, DatabaseConfigModule],
  providers: [
    AuthService,
    AuthGuard,
    RequestConverterService,
    ResponseHandlerService
  ],
  controllers: [AuthController, TestController],
  exports: [AuthService, AuthGuard]
})
export class AuthModule {}