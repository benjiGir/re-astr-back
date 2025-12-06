import { LoggerService } from '../logger.service'
import { NoopLoggerService } from '../noop-logger.service'

/**
 * Creates a mock logger provider for use in tests
 * This makes it easy to include logging in test modules without configuration
 *
 * @example
 * ```typescript
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     getMockLoggerProvider(),
 *   ],
 * }).compile()
 * ```
 */
export function getMockLoggerProvider() {
  return {
    provide: LoggerService,
    useClass: NoopLoggerService,
  }
}