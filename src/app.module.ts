import { LoggerModule } from '@common/logger/logger.module'
import { ValidationModule } from '@common/validation/validation.module'
import { DatabaseModule } from '@database/database.module'
import { CategoriesModule } from '@modules/categories/categories.module'
import { ProjectsModule } from '@modules/projects/projects.module'
import { TestsModule } from '@modules/tests/tests.module'
import { UsersModule } from '@modules/users/users.module'
import { ClassSerializerInterceptor, Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { AuthModule } from '@/auth/auth.module'
import { HealthModule } from '@/health/health.module'
import { MinioModule } from '@/storage/minio/minio.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule,
    HealthModule,
    DatabaseModule,
    ValidationModule,
    MinioModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProjectsModule,
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
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
