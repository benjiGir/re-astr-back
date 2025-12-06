import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import type { ILogger } from './logger.interface'

/**
 * Production logger implementation using Pino
 * Wraps nestjs-pino's PinoLogger to conform to our ILogger interface
 */
@Injectable()
export class PinoLoggerService implements ILogger {
  constructor(private readonly pinoLogger: PinoLogger) {}

  setContext(context: string): void {
    this.pinoLogger.setContext(context)
  }

  trace(message: string): void
  trace(obj: Record<string, any>, message: string): void
  trace(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.pinoLogger.trace(objOrMessage)
    } else {
      this.pinoLogger.trace(objOrMessage, message!)
    }
  }

  debug(message: string): void
  debug(obj: Record<string, any>, message: string): void
  debug(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.pinoLogger.debug(objOrMessage)
    } else {
      this.pinoLogger.debug(objOrMessage, message!)
    }
  }

  info(message: string): void
  info(obj: Record<string, any>, message: string): void
  info(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.pinoLogger.info(objOrMessage)
    } else {
      this.pinoLogger.info(objOrMessage, message!)
    }
  }

  warn(message: string): void
  warn(obj: Record<string, any>, message: string): void
  warn(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.pinoLogger.warn(objOrMessage)
    } else {
      this.pinoLogger.warn(objOrMessage, message!)
    }
  }

  error(message: string): void
  error(obj: Record<string, any>, message: string): void
  error(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.pinoLogger.error(objOrMessage)
    } else {
      this.pinoLogger.error(objOrMessage, message!)
    }
  }

  fatal(message: string): void
  fatal(obj: Record<string, any>, message: string): void
  fatal(objOrMessage: Record<string, any> | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.pinoLogger.fatal(objOrMessage)
    } else {
      this.pinoLogger.fatal(objOrMessage, message!)
    }
  }
}