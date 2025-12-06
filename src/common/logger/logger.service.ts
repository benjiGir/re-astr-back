import { Injectable } from '@nestjs/common'
import type { ILogger } from './logger.interface'

/**
 * Main logger service used throughout the application
 * This is a facade that delegates to the actual logger implementation
 * The implementation is injected via the LOGGER_IMPLEMENTATION token
 */
@Injectable()
export class LoggerService implements ILogger {
  constructor(private readonly logger: ILogger) {}

  setContext(context: string): void {
    this.logger.setContext(context)
  }

  trace(message: string): void
  trace(obj: Record<string, any>, message: string): void
  trace(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.logger.trace(objOrMessage)
    } else {
      this.logger.trace(objOrMessage, message!)
    }
  }

  debug(message: string): void
  debug(obj: Record<string, any>, message: string): void
  debug(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.logger.debug(objOrMessage)
    } else {
      this.logger.debug(objOrMessage, message!)
    }
  }

  info(message: string): void
  info(obj: Record<string, any>, message: string): void
  info(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.logger.info(objOrMessage)
    } else {
      this.logger.info(objOrMessage, message!)
    }
  }

  warn(message: string): void
  warn(obj: Record<string, any>, message: string): void
  warn(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.logger.warn(objOrMessage)
    } else {
      this.logger.warn(objOrMessage, message!)
    }
  }

  error(message: string): void
  error(obj: Record<string, any>, message: string): void
  error(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.logger.error(objOrMessage)
    } else {
      this.logger.error(objOrMessage, message!)
    }
  }

  fatal(message: string): void
  fatal(obj: Record<string, any>, message: string): void
  fatal(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.logger.fatal(objOrMessage)
    } else {
      this.logger.fatal(objOrMessage, message!)
    }
  }
}