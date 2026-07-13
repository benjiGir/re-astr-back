# Logger Output Format

## Overview

The application uses a clean, simplified log format in development mode with minimal noise and maximum readability.

## Quick Start

The logger is now configured to show **only essential information** with no verbose JSON dumps.

## Log Format

```
[TIME] LEVEL [CONTEXT] MESSAGE
       ↓      ↓         ↓       ↓
[14:32:15.123] 📘 INFO [AuthService] User logged in successfully
```

### Components

1. **Timestamp** - Gray, millisecond precision (`HH:MM:ss.l`)
2. **Level** - Color-coded with emoji icon
3. **Context** - Yellow, service/module name in brackets
4. **Message** - The actual log message
5. **Metadata** - Additional structured data (JSON)

## Log Levels

Each level has a unique color and emoji for easy visual scanning:

| Level | Emoji | Color   | Use Case                        |
|-------|-------|---------|----------------------------------|
| TRACE | 🔍    | Gray    | Very detailed debugging info     |
| DEBUG | 🐛    | Magenta | Debugging information            |
| INFO  | 📘    | Cyan    | General informational messages   |
| WARN  | ⚠️     | Yellow  | Warning messages                 |
| ERROR | ❌    | Red     | Error messages                   |
| FATAL | 💀    | Red BG  | Fatal errors                     |

## Example Output

### Simple Message
```
14:32:15.123 📘 INFO  [AuthService        ] Initializing Better Auth service
```

### With Metadata
```
14:32:15.456 📘 INFO  [AuthService        ] Better Auth service initialized successfully
{
  "emailPasswordEnabled": true,
  "sessionExpiresIn": 604800
}
```

### HTTP Request
```
14:32:16.789 📘 INFO  [HTTP               ] GET /api/users 200 - 45ms
```

### Error with Stack Trace
```
14:32:17.012 ❌ ERROR [CategoriesService  ] Category creation failed
{
  "error": "Validation failed",
  "categoryId": "123"
}
```

### Debug Information
```
14:32:18.345 🐛 DEBUG [AuthService        ] Session verified successfully
{
  "userId": "user-abc-123",
  "sessionId": "sess-xyz-456"
}
```

## Production Mode

In production (`NODE_ENV=production`), logs are output as structured JSON for log aggregation systems:

```json
{
  "level": 30,
  "time": 1709123456789,
  "context": "AuthService",
  "msg": "User logged in successfully",
  "userId": "123",
  "requestId": "req-abc"
}
```

## Configuration

The logger configuration is in `/src/common/logger/logger.config.ts`.

### Key Features

- **PII Redaction**: Automatically redacts passwords, tokens, cookies
- **HTTP Logging**: Automatic request/response logging
- **Context Propagation**: Context (service name) flows through logs
- **Structured Metadata**: Additional data as JSON objects
- **Health Check Filtering**: `/metrics` is not logged (⚠️ `/health` is NOT actually filtered — `logger.config.ts` `autoLogging.ignore` only checks `/metrics`)

## Usage in Code

```typescript
import { LoggerService } from '@common/logger/logger.service'

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(MyService.name)
  }

  doSomething() {
    // Simple message
    this.logger.info('Operation started')

    // With metadata
    this.logger.info({ userId: '123', action: 'create' }, 'Creating new record')

    // Different levels
    this.logger.debug('Debug information')
    this.logger.warn({ count: 0 }, 'No records found')
    this.logger.error({ error: err.message }, 'Operation failed')
  }
}
```

## Visual Examples

### Application Startup
```
14:30:01.001 📘 INFO  [Bootstrap          ] 🚀 Application is running on: http://localhost:3000
14:30:01.002 📘 INFO  [Bootstrap          ] 📚 API Documentation available at: http://localhost:3000/docs
14:30:01.105 📘 INFO  [AuthService        ] Initializing Better Auth service
14:30:01.234 📘 INFO  [AuthService        ] Better Auth service initialized successfully
```

### API Request Flow
```
14:32:15.100 🐛 DEBUG [AuthGuard          ] Verifying session token
14:32:15.123 📘 INFO  [CategoriesService ] Creating new category
14:32:15.156 🐛 DEBUG [CategoriesService ] Category created successfully
14:32:15.189 📘 INFO  [HTTP              ] POST /api/categories 201 - 89ms
```

### Error Scenario
```
14:35:20.001 ⚠️  WARN  [CategoriesService ] Category not found
{
  "categoryId": "non-existent-id"
}
14:35:20.012 ❌ ERROR [HTTP              ] POST /api/categories 404 - 11ms
```

## Tips

1. **Use context** - Always set context in constructor with `this.logger.setContext(ServiceName.name)`
2. **Add metadata** - Include relevant data as the first parameter: `logger.info({ userId }, 'Message')`
3. **Choose appropriate level** - Use DEBUG for detailed info, INFO for normal flow, WARN for issues, ERROR for failures
4. **Keep messages concise** - Put details in metadata, not the message
5. **Don't log sensitive data** - The logger auto-redacts passwords/tokens, but be careful with custom fields

## Environment Variables

- `LOG_LEVEL` - Override default log level (trace, debug, info, warn, error, fatal)
- `NODE_ENV` - Controls format (development = pretty, production = JSON)