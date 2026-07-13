import { inspect } from 'node:util'
import { Cause, Effect, Layer, Logger } from 'effect'
import { CurrentLogAnnotations } from 'effect/References'
import { AppConfig } from '@/infra/Config.js'

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'confirmpassword',
  'currentpassword',
  'newpassword',
])

const redact = (annotations: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(annotations)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value
  }
  return result
}

const isCauseEmpty = (cause: Cause.Cause<unknown>): boolean =>
  !(Cause.hasFails(cause) || Cause.hasDies(cause) || Cause.hasInterrupts(cause))

const LEVEL_COLOR: Record<string, string> = {
  Trace: '\x1b[90m',
  Debug: '\x1b[35m',
  Info: '\x1b[36m',
  Warn: '\x1b[33m',
  Error: '\x1b[31m',
  Fatal: '\x1b[41m',
}
const RESET = '\x1b[0m'

const formatMessage = (message: unknown): string => {
  const value = Array.isArray(message) && message.length === 1 ? message[0] : message
  if (typeof value === 'string') return value
  return inspect(value, { colors: false, depth: 4 })
}

const makePretty = () =>
  Logger.make<unknown, void>(({ cause, date, fiber, logLevel, message }) => {
    const color = LEVEL_COLOR[logLevel] ?? ''
    const time = date.toISOString().slice(11, 23)
    const annotationsObj = redact(fiber.getRef(CurrentLogAnnotations))

    let line = `${color}[${time}] ${logLevel}${RESET} ${formatMessage(message)}`
    if (Object.keys(annotationsObj).length > 0) line += ` ${inspect(annotationsObj, { colors: false, depth: 4 })}`
    if (!isCauseEmpty(cause)) line += `\n${Cause.pretty(cause)}`

    globalThis.console.log(line)
  })

const makeJson = () =>
  Logger.make<unknown, void>(({ cause, date, fiber, logLevel, message }) => {
    const entry = {
      timestamp: date.toISOString(),
      level: logLevel,
      message: Array.isArray(message) && message.length === 1 ? message[0] : message,
      ...redact(fiber.getRef(CurrentLogAnnotations)),
      ...(isCauseEmpty(cause) ? {} : { cause: Cause.pretty(cause) }),
    }
    globalThis.console.log(JSON.stringify(entry))
  })

/**
 * Env-aware, same intent as the old NestJS LoggerModule (dev = pretty, prod = JSON),
 * minus the Noop variant: tests just get whatever Logger.defaultLogger prints.
 */
export const LoggerLive = Layer.unwrap(
  Effect.gen(function* () {
    const { nodeEnv } = yield* AppConfig
    const logger = nodeEnv === 'production' ? makeJson() : makePretty()
    return Logger.layer([logger])
  }),
)
