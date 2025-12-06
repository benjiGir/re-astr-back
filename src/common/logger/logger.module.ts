import { loggerConfig } from '@common/logger/logger.config'
import { Global, Module } from '@nestjs/common'
import { LoggerModule as NestJsPinoLoggerModule, type Params } from 'nestjs-pino'
import type { ILogger } from './logger.interface'
import { LoggerService } from './logger.service'
import { NoopLoggerService } from './noop-logger.service'
import { PinoLoggerService } from './pino-logger.service'

const isTestEnvironment = process.env.NODE_ENV === 'test'

/**
 * Logger module configuration
 * Provides the appropriate logger implementation based on environment
 */
@Global()
@Module({
  imports: isTestEnvironment ? [] : [NestJsPinoLoggerModule.forRoot(loggerConfig as Params)],
  providers: [
    {
      provide: 'LOGGER_IMPLEMENTATION',
      useClass: isTestEnvironment ? NoopLoggerService : PinoLoggerService,
    },
    {
      provide: LoggerService,
      useFactory: (loggerImpl: ILogger) => {
        return new LoggerService(loggerImpl)
      },
      inject: ['LOGGER_IMPLEMENTATION'],
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
