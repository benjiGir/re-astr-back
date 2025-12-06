/**
 * Logger interface that all logger implementations must follow
 * This abstraction allows for easy testing and swapping of logger implementations
 */
export interface ILogger {
  /**
   * Set the context for all subsequent log messages
   * @param context - Usually the class name or module name
   */
  setContext(context: string): void

  /**
   * Log a message at trace level (most verbose)
   */
  trace(message: string): void
  trace(obj: Record<string, any>, message: string): void

  /**
   * Log a message at debug level
   */
  debug(message: string): void
  debug(obj: Record<string, any>, message: string): void

  /**
   * Log a message at info level
   */
  info(message: string): void
  info(obj: Record<string, any>, message: string): void

  /**
   * Log a message at warn level
   */
  warn(message: string): void
  warn(obj: Record<string, any>, message: string): void

  /**
   * Log a message at error level
   */
  error(message: string): void
  error(obj: Record<string, any>, message: string): void

  /**
   * Log a message at fatal level (most severe)
   */
  fatal(message: string): void
  fatal(obj: Record<string, any>, message: string): void
}