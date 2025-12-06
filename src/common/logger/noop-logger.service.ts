import { Injectable } from '@nestjs/common'
import type { ILogger } from './logger.interface'

/**
 * No-op logger implementation for testing
 * All methods are empty - logs are silently discarded
 * This makes tests cleaner and faster by eliminating log noise
 */
@Injectable()
export class NoopLoggerService implements ILogger {
  // biome-ignore lint/suspicious/noEmptyBlockStatements: No-op intentionally does nothing
  setContext(_context: string): void {}

  // biome-ignore lint/suspicious/noEmptyBlockStatements: No-op intentionally does nothing
  trace(_objOrMessage: Record<string, any> | string, _message?: string): void {}

  // biome-ignore lint/suspicious/noEmptyBlockStatements: No-op intentionally does nothing
  debug(_objOrMessage: Record<string, any> | string, _message?: string): void {}

  // biome-ignore lint/suspicious/noEmptyBlockStatements: No-op intentionally does nothing
  info(_objOrMessage: Record<string, any> | string, _message?: string): void {}

  // biome-ignore lint/suspicious/noEmptyBlockStatements: No-op intentionally does nothing
  warn(_objOrMessage: Record<string, any> | string, _message?: string): void {}

  // biome-ignore lint/suspicious/noEmptyBlockStatements: No-op intentionally does nothing
  error(_objOrMessage: Record<string, any> | string, _message?: string): void {}

  // biome-ignore lint/suspicious/noEmptyBlockStatements: No-op intentionally does nothing
  fatal(_objOrMessage: Record<string, any> | string, _message?: string): void {}
}