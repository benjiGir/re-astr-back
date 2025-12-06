# Logging System

This directory contains the application's logging infrastructure. The logging system is designed to be **transparent in tests** while providing powerful structured logging in production using Pino.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LoggerModule                          │
│  (Global module - automatically available everywhere)    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ├─── Environment Detection
                     │
      ┌──────────────┴──────────────┐
      │                             │
      ▼ (Production/Dev)            ▼ (Test)
┌──────────────┐              ┌──────────────┐
│PinoLogger    │              │NoopLogger    │
│Service       │              │Service       │
│              │              │              │
│ - Structured │              │ - Silent     │
│ - Pretty dev │              │ - Fast       │
│ - JSON prod  │              │ - Zero deps  │
└──────────────┘              └──────────────┘
```

## Usage in Services

Simply inject `LoggerService` and use it:

```typescript
import { LoggerService } from '@common/logger/logger.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(MyService.name)
  }

  doSomething() {
    this.logger.info('Starting operation')
    this.logger.debug({ userId: '123' }, 'Processing user data')
    this.logger.warn({ count: 0 }, 'No records found')
    this.logger.error({ error: 'Failed' }, 'Operation failed')
  }
}
```

## Usage in Tests

Add the `getMockLoggerProvider()` helper to your test module:

```typescript
import { getMockLoggerProvider } from '@common/logger/test/logger.mock'
import { Test } from '@nestjs/testing'

describe('MyService', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MyService,
        getMockLoggerProvider(), // ← Add this
        // ... other providers
      ],
    }).compile()

    // ...
  })
})
```

That's it! No configuration needed, no noise in test output.

## Available Log Levels

All log methods support two signatures:

```typescript
// Simple message
logger.info('Something happened')

// Structured logging with context
logger.info({ userId: '123', action: 'login' }, 'User logged in')
```

Available levels (from most to least verbose):

- `trace()` - Very detailed debugging information
- `debug()` - Debugging information
- `info()` - Informational messages
- `warn()` - Warning messages
- `error()` - Error messages
- `fatal()` - Fatal error messages

## Environment Behavior

- **`NODE_ENV=test`**: Uses `NoopLoggerService` - all logs are silently discarded
- **`NODE_ENV=development`**: Uses `PinoLoggerService` with pretty-printing and colors
- **`NODE_ENV=production`**: Uses `PinoLoggerService` with JSON output for log aggregation

## Features

### ✅ Test-Friendly
- Zero configuration in tests
- No log noise in test output
- Fast test execution

### ✅ Production-Ready
- Structured JSON logging
- HTTP request/response logging
- Automatic PII redaction (passwords, tokens, etc.)
- Context propagation

### ✅ Type-Safe
- Full TypeScript support
- Conforms to `ILogger` interface
- Strict null checks compatible

## Files

- `logger.interface.ts` - Logger interface definition
- `logger.service.ts` - Main logger facade
- `pino-logger.service.ts` - Pino implementation (production)
- `noop-logger.service.ts` - No-op implementation (tests)
- `logger.module.ts` - Module configuration
- `test/logger.mock.ts` - Test helper

## Migration from PinoLogger

Old code:
```typescript
import { PinoLogger } from 'nestjs-pino'

constructor(private readonly logger: PinoLogger) {
  this.logger.setContext(MyService.name)
}
```

New code:
```typescript
import { LoggerService } from '@common/logger/logger.service'

constructor(private readonly logger: LoggerService) {
  this.logger.setContext(MyService.name)
}
```

In tests, add `getMockLoggerProvider()` to your providers array.