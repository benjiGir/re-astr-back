# RE-ASTR Server

Backend server for the RE-ASTR application (Automotive Software Testing Results), a test management and results system for electronic components.

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#️-configuration)
- [Database](#️-database)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [Testing](#-testing)
- [Logging](#-logging)
- [API Documentation](#-api-documentation)
- [Modules](#️-modules)

## 🚀 Tech Stack

- **Runtime framework**: [Effect](https://effect.website/) v4 (beta) — services, layers, typed errors, and the `effect/unstable/http` `HttpApi` module for routing (no Express/Fastify/NestJS)
- **HTTP server**: Node's built-in `http` server via `@effect/platform-node`
- **Database**: PostgreSQL
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (via `@effect/sql-pg` + `drizzle-orm/effect-postgres`)
- **Authentication**: custom cookie-based session auth (argon2 password hashing) — not Better Auth, despite the legacy cookie name kept for continuity
- **Validation**: Effect `Schema`
- **Logging**: custom Effect `Logger` (pretty console in dev, JSON in prod)
- **API Documentation**: OpenAPI, rendered with Scalar
- **File Storage**: MinIO (S3-compatible)
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Testing**: Vitest + `@effect/vitest`
- **Code Quality**: oxlint, oxfmt

## 📦 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** >= 24.0.0
- **pnpm**
- **PostgreSQL** >= 14 (or Docker to use it via docker-compose)
- **Docker** (optional, for MinIO and/or the full stack)

### Installing pnpm

If you don't have pnpm installed:

```bash
npm install -g pnpm
```

Or via Homebrew (macOS):

```bash
brew install pnpm
```

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd re-astr
```

### 2. Install dependencies

```bash
pnpm install
```

## ⚙️ Configuration

### 1. Create environment file

Copy the `.env.example` file and rename it to `.env`:

```bash
cp .env.example .env
```

### 2. Configure environment variables

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — (required) | PostgreSQL connection string |
| `COOKIE_SECRET` | — (required) | HMAC key signing the session cookie; boot fails loudly if missing, by design |
| `AUTH_SESSION_EXPIRES` | `604800` (7d, seconds) | |
| `AUTH_SESSION_UPDATE_AGE` | `86400` (1d, seconds) | reserved for a session-refresh feature, not yet wired into the auth flow |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `LOG_LEVEL` | `Info` (prod) / `Debug` (else) | `All`\|`Fatal`\|`Error`\|`Warn`\|`Info`\|`Debug`\|`Trace`\|`None` (case-sensitive) |
| `PORT` | `3000` | HTTP server port |
| `CORS_ORIGIN` | `http://localhost:5173` | not present in `.env.example`, override if your frontend runs elsewhere |
| `MINIO_ENDPOINT` | `localhost` | |
| `MINIO_PORT` | `9000` | |
| `MINIO_USE_SSL` | `false` | |
| `MINIO_ACCESS_KEY` | — (required) | |
| `MINIO_SECRET_KEY` | — (required) | |

`MINIO_DEFAULT_BUCKET` also appears in `.env.example` but isn't read by any code path — bucket names are set per file record instead (see [Modules](#️-modules)).

### 3. Create PostgreSQL database

If you're using local PostgreSQL:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE "re-astr";

# Create a user (optional)
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE "re-astr" TO your_username;
```

### 4. Start MinIO (file storage)

The project uses MinIO for file storage. Start it with Docker Compose:

```bash
docker-compose up -d
```

MinIO will be accessible at:
- **API**: http://localhost:9000
- **Web Console**: http://localhost:9001
- **Credentials**: minioadmin / minioadmin

## 🗄️ Database

The project uses **Drizzle ORM** with SQL migrations tracked in `/drizzle`.

### Generate migrations

After modifying schemas in `/src/domain/schema/`:

```bash
pnpm run db:generate
```

### Apply migrations

To apply migrations to your database:

```bash
pnpm run db:migrate
```

### Direct push (development only)

To directly synchronize the schema without creating a migration file:

```bash
pnpm run db:push
```

### Drizzle Studio (graphical interface)

To explore your database via a web interface:

```bash
pnpm run db:studio
```

Drizzle Studio will be accessible at: http://localhost:4983

### Seed data

```bash
pnpm run db:seed
```

## 🚀 Getting Started

### Option 1: Docker (Recommended for quick start)

**Development (dependencies only):**
```bash
# Start PostgreSQL + MinIO
./docker-helper.sh dev

# Or manually:
docker-compose -f docker-compose.dev.yml up -d

# Run app locally with hot-reload
pnpm run start:dev
```

**Production (full stack):**
```bash
# Build and start everything
./docker-helper.sh up

# Or manually:
docker-compose up -d

# View logs
./docker-helper.sh logs
```

Access:
- **API**: http://localhost:3000
- **API docs**: http://localhost:3000/docs
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

### Option 2: Local Development

Start the server with automatic reload (watch mode):

```bash
pnpm run start:dev
```

The server will start on **http://localhost:3000**

### Production mode

```bash
# 1. Build the application
pnpm run build

# 2. Start in production mode
pnpm run start:prod
```

## 📁 Project Structure

```
re-astr/
├── src/
│   ├── modules/            # Feature modules
│   │   ├── categories/     # Test categories management
│   │   ├── projects/       # Projects management (container for tests)
│   │   ├── test-files/     # Test file uploads (MinIO-backed)
│   │   ├── tests/          # Tests management
│   │   └── users/          # Users management
│   ├── auth/               # Cookie-based session auth, roles, guards
│   ├── domain/schema/      # Drizzle table definitions
│   ├── infra/              # Config, Database, Logger, Minio layers
│   ├── common/             # Shared utilities (schema validation, etc.)
│   ├── Api.ts              # Assembles all HttpApiGroups + the health group
│   ├── main.ts             # Entry point (HTTP server bootstrap)
│   └── Seed.ts             # Database seed script
├── drizzle/                # Generated SQL migrations
├── dist/                   # Production build
├── .env                    # Environment variables (not versioned)
├── .env.example            # Configuration template
├── docker-compose.yml      # Full stack (app + Postgres + MinIO)
├── docker-compose.dev.yml  # Dependencies only (Postgres + MinIO)
├── docker-helper.sh        # Wrapper around the compose files above
├── drizzle.config.ts       # Drizzle-kit configuration
├── vitest.config.ts        # Vitest configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## 📜 Available Scripts

### Development

```bash
pnpm run start:dev     # Start in watch mode (automatic reload)
pnpm run start:prod    # Start in production (runs dist/main.js)
```

### Build

```bash
pnpm run build         # Compile TypeScript project
```

### Database

```bash
pnpm run db:generate   # Generate Drizzle migrations
pnpm run db:migrate    # Apply migrations
pnpm run db:push       # Direct schema push (dev only)
pnpm run db:studio     # Open Drizzle Studio (GUI)
pnpm run db:seed       # Seed the database
```

### Testing

```bash
pnpm run test          # Run all tests
pnpm run test:watch    # Tests in watch mode
pnpm run test:cov      # Tests with code coverage
```

### Code Quality

```bash
pnpm run lint          # Lint with oxlint (auto-fix)
pnpm run lint:check    # Lint with oxlint (no fix, CI mode)
pnpm run format        # Format with oxfmt
pnpm run format:check  # Format check (no write, CI mode)
pnpm run check         # format + lint --fix
pnpm run check:ci      # format:check + lint:check
```

## 🧪 Testing

The project uses **Vitest** with **`@effect/vitest`** for unit tests.

### Run all tests

```bash
pnpm test
```

### Tests in watch mode (development)

```bash
pnpm test:watch
```

### Tests with code coverage

```bash
pnpm test:cov
```

The coverage report will be generated in `/coverage/`.

### Naming conventions

- Tests: `*.spec.ts`, colocated next to the tested file (`vitest.config.ts` includes `src/**/*.spec.ts`)
- There is no separate `test/`/`e2e/` folder — everything currently lives as colocated specs

### Effect test pattern

Import `describe`/`expect`/`it` from `@effect/vitest` instead of `vitest`, and run the test body as an Effect via `it.effect`:

```typescript
import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

describe('CategoriesService', () => {
  it.effect('creates a category', () =>
    Effect.gen(function* () {
      const service = yield* CategoriesService
      const category = yield* service.create(/* ... */)
      expect(category.id).toBeDefined()
    }),
  )
})
```

Dependencies are satisfied with `Effect.provideService`/test layers rather than mocking frameworks.

## 📊 Logging

The application uses a small custom `Logger` (`src/infra/Logger.ts`) built on Effect's `Logger` API — there is no Pino/nestjs-pino dependency.

### Features

- **Two formats**: colorized single-line output in development, structured JSON (one line per entry) in production — picked automatically from `NODE_ENV`
- **Sensitive data redaction** — `authorization`, `cookie`, `set-cookie`, `password`, and related annotation keys are redacted before printing
- **Annotation-based context** — attach structured data with `Effect.annotateLogs` instead of a logger instance per class

### Quick Start

```typescript
import { Effect } from 'effect'

const program = Effect.gen(function* () {
  // Structured logging via annotations
  yield* Effect.logInfo('User created item').pipe(Effect.annotateLogs({ userId: '123' }))

  // Different log levels
  yield* Effect.logDebug('Detailed debug information')
  yield* Effect.logWarning('Approaching rate limit').pipe(Effect.annotateLogs({ threshold: 90 }))
  yield* Effect.logError('Operation failed')
})
```

### Configuration

Log level can be controlled via environment variable:

```bash
# Set in .env
LOG_LEVEL=Debug  # All, Fatal, Error, Warn, Info, Debug, Trace, None
```

- **Development**: Logs are pretty-printed in color (`[HH:MM:SS.mmm] Level message {annotations}`)
- **Production**: Logs are output as JSON (one line per entry)

## 📚 API Documentation

The interactive API documentation is generated from the `HttpApi` definition (`src/Api.ts`) and rendered with **Scalar**.

Once the server is started, access:

**http://localhost:3000/docs**

## 🏗️ Modules

Each feature module under `src/modules/<name>/` follows the same four-file layering:

- `<Entity>.ts` — domain layer: Effect `Schema.Class` DTOs and `Schema.TaggedErrorClass` domain errors, independent of Drizzle/HTTP
- `<Module>Repo.ts` — `Context.Service` wrapping raw Drizzle queries against the table
- `<Module>Service.ts` — business logic: calls the repo, maps DB constraint errors to domain errors, logs via `Effect.logInfo`
- `<Module>Http.ts` — `HttpApiGroup` route declarations and handlers, calling the service

All routes below are behind the `Authorization` middleware (must be signed in); required roles are noted where a route enforces one on top of that. Role hierarchy, low to high: `user` < `contributor` < `archivist` < `master`.

### `auth` - Authentication

Cookie-based session auth with argon2 password hashing (`src/auth/`).

- `POST /auth/sign-up/email` — register (no session required)
- `POST /auth/sign-in/email` — log in (no session required)
- `POST /auth/forgot-password` — request a password-reset token (no session required)
- `POST /auth/reset-password` — consume a reset token (no session required)
- `POST /auth/sign-out` — invalidate the current session
- `GET /auth/get-session` — return the current session/user

### `health` - Health Checks

Defined directly in `src/Api.ts`, not under `modules/`.

- `GET /health` — liveness, always 200
- `GET /health/ready` — readiness, checks the database connection

### `projects` - Projects Management

Top-level container that tests belong to (`tests.projectId` is a required FK).

- `GET /projects` / `GET /projects/:id`
- `POST /projects` — requires role `contributor`
- `PATCH /projects/:id` / `DELETE /projects/:id` — require role `archivist`

### `categories` - Categories Management

Categories carry a JSON schema (`baseSchema`/`customFieldsSchema`) used to validate a test's `commonData`/`customData`.

- `GET /categories` / `GET /categories/:id`
- `POST /categories` — requires role `contributor`
- `PATCH /categories/:id` / `DELETE /categories/:id` — require role `archivist`

### `tests` - Tests Management

- `GET /tests` (optional `?categoryId=`) / `GET /tests/:id`
- `POST /tests` — requires role `contributor`
- `PATCH /tests/:id` — requires role `contributor`
- `DELETE /tests/:id` — requires role `archivist`

### `test-files` - Test File Management

File uploads attached to a test (screenshots, reports, docs), backed by MinIO.

- `GET /test-files` (optional `?testId=`) / `GET /test-files/:id`
- `POST /test-files/upload` — multipart upload, max 50MB, requires role `contributor`
- `PATCH /test-files/:id` — requires role `contributor`
- `GET /test-files/:id/download` — streams the file
- `GET /test-files/:id/presigned-url` (optional `?expirySeconds=`, default 3600)
- `DELETE /test-files/:id` — requires role `archivist`

### `users` - Users Management

- `GET /users` / `GET /users/:id`
- `PATCH /users/:id` — self, or role `master`
- `PATCH /users/:id/role` — requires role `master`
- `DELETE /users/:id` — requires role `master`
