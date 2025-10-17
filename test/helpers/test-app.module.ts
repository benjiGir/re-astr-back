import { ClassSerializerInterceptor, Module, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { DatabaseModule } from '@database/database.module';
import { CategoriesModule } from '@modules/categories/categories.module';
import { TestsModule } from '@modules/tests/tests.module';
import { UsersModule } from '@modules/users/users.module';
import { MinioModule } from '@/storage/minio/minio.module';
import { ValidationModule } from '@common/validation/validation.module';

// Mock empty modules
@Module({})
export class MockHealthModule {}

@Module({})
export class MockAuthModule {}

/**
 * TestAppModule - A version of AppModule for E2E tests
 * Excludes LoggerModule, HealthModule, and AuthModule
 * Provides a mocked PinoLogger instead
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Silent logger for tests - doesn't output anything but still provides PinoLogger
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'silent', // Silent = no logs
        autoLogging: false, // Don't log HTTP requests
      },
    }),
    DatabaseModule,
    ValidationModule,
    MinioModule,
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
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class TestAppModule {}