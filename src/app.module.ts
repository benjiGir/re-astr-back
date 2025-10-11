import {ClassSerializerInterceptor, Module, ValidationPipe} from '@nestjs/common'
import { APP_INTERCEPTOR, APP_PIPE} from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { DatabaseModule } from '@database/database.module'
import { AuthModule } from '@/auth/auth.module'
import { CategoriesModule } from '@modules/categories/categories.module'
import { TestsModule } from '@modules/tests/tests.module'
import { UsersModule } from '@modules/users/users.module'
import { MinioModule } from '@/storage/minio/minio.module'
import { ValidationModule } from '@common/validation/validation.module'
import { loggerConfig } from '@config/logger.config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot(loggerConfig),
    DatabaseModule,
    ValidationModule,
    MinioModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    TestsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,

      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor
    }
  ],
})
export class AppModule {}
