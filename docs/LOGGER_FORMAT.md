# Logger Output Format

## Overview

`src/infra/Logger.ts` implements a small custom `effect` `Logger` — no Pino, no NestJS logger module. Two formats are picked automatically from `NODE_ENV`: colorized single-line text in development, structured JSON in production.

## Log Format (development)

```
[TIME] LEVEL MESSAGE {ANNOTATIONS}
```

```
[14:32:15.123] Info Category created { id: 'cat-abc-123' }
```

### Components

1. **Timestamp** — `date.toISOString().slice(11, 23)`, i.e. `HH:MM:ss.mmm`
2. **Level** — the whole `[TIME] LEVEL` prefix is wrapped in an ANSI color for that level
3. **Message** — string as-is, or `util.inspect`-formatted for non-string values
4. **Annotations** — appended via `util.inspect` only if `Effect.annotateLogs` was used (omitted otherwise)
5. **Cause** — if the log carries a non-empty `Cause` (fail/die/interrupt), `Cause.pretty(cause)` is appended on a new line

## Log Levels

| Level | ANSI color |
|-------|------------|
| Trace | gray |
| Debug | magenta |
| Info  | cyan |
| Warn  | yellow |
| Error | red |
| Fatal | red background |

These are Effect's own `LogLevel` labels (`Trace`/`Debug`/`Info`/`Warn`/`Error`/`Fatal`), not a custom enum.

## Example Output

### Simple message
```
[14:32:15.123] Info Category created
```

### With annotations
```
[14:32:15.456] Info Category created { id: 'cat-abc-123', name: 'Thermal' }
```

### Error with cause
```
[14:32:17.012] Error Category creation failed
Error: constraint violation
    at ...
```

## Production Mode

In production (`NODE_ENV=production`), each entry is a single JSON line instead:

```json
{ "timestamp": "2026-07-17T14:32:15.456Z", "level": "Info", "message": "Category created", "id": "cat-abc-123" }
```

Annotation keys are spread directly onto the entry object (not nested under a `metadata` key), plus a `cause` field when the log carries a non-empty cause.

## Configuration

The logger lives entirely in `src/infra/Logger.ts` — there is no separate `logger.config.ts`. `LoggerLive` (`Layer.unwrap`) reads `AppConfig.nodeEnv` and swaps in `makeJson()` for `production`, `makePretty()` otherwise. Tests get whichever `Logger.defaultLogger` prints; there's no dedicated no-op/test variant.

### Key features

- **Redaction** — annotation keys matching (case-insensitively) `authorization`, `cookie`, `set-cookie`, `password`, `confirmpassword`, `currentpassword`, `newpassword` are replaced with `[REDACTED]` before printing, in both formats
- **No HTTP access-log middleware** — request logging isn't automatic; log explicitly where needed
- **Annotation-based context** — there's no per-service logger instance or `setContext`; attach structured data with `Effect.annotateLogs` on the Effect itself

## Usage in Code

```typescript
import { Effect } from 'effect'

const create = (input: CreateCategory) =>
  Effect.gen(function* () {
    const category = yield* repo.insert(input)

    yield* Effect.logInfo('Category created').pipe(Effect.annotateLogs({ id: category.id }))

    return category
  })
```

Available level helpers: `Effect.logTrace`, `Effect.logDebug`, `Effect.logInfo`, `Effect.logWarning`, `Effect.logError`, `Effect.logFatal`. Chain `.pipe(Effect.annotateLogs({ ... }))` to attach structured data instead of passing it as a second argument.

## Environment Variables

- `LOG_LEVEL` — `All` | `Fatal` | `Error` | `Warn` | `Info` | `Debug` | `Trace` | `None` (case-sensitive). Defaults to `Info` in production, `Debug` otherwise.
- `NODE_ENV` — controls format (`production` = JSON, anything else = pretty)
