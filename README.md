# RE-ASTR Server

Backend server for the RE-ASTR application (Automotive Software Testing Results), a test management and results system for electronic components.

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Database](#️-database)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [Testing](#-testing)
- [API Documentation](#-api-documentation)
- [Modules](#-modules)

## 🚀 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) v11
- **HTTP Adapter**: [Fastify](https://fastify.dev/) v5 (instead of Express for better performance)
- **Database**: PostgreSQL
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) v0.44
- **Authentication**: [Better Auth](https://www.better-auth.com/) v1.3
- **Validation**: class-validator + class-transformer + Zod
- **API Documentation**: Swagger/OpenAPI
- **File Storage**: MinIO (S3-compatible)
- **Language**: TypeScript 5.9
- **Package Manager**: pnpm
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier, Biome

## 📦 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** >= 22.0.0
- **pnpm** >= 8.0.0 (package manager)
- **PostgreSQL** >= 14 (or Docker to use it via docker-compose)
- **Docker** (optional, for MinIO)

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

Edit the `.env` file with your values:

```env
# PostgreSQL Database
DATABASE_URL="postgresql://username:password@localhost:5432/re-astr"

# Better Auth - Secrets for authentication
BETTER_AUTH_SECRET="your-secret-key-here-replace-in-production"
COOKIE_SECRET="your-cookie-secret-key-here"

# Session Configuration (optional - default values available)
AUTH_SESSION_EXPIRES="604800"    # 7 days in seconds
AUTH_SESSION_UPDATE_AGE="86400"  # 1 day in seconds

# Email/Password Auth (optional - enabled by default)
AUTH_EMAIL_PASSWORD_ENABLED="true"
AUTH_REQUIRE_EMAIL_VERIFICATION="false"

# CORS (optional)
AUTH_CORS_ORIGIN="true"
AUTH_CORS_CREDENTIALS="true"

# Application
BASE_URL="http://localhost:3000"
NODE_ENV="development"

# MinIO Storage (S3-compatible)
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_DEFAULT_BUCKET="uploads"
```

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

The project uses **Drizzle ORM** with automatic migrations.

### Generate migrations

After modifying schemas in `/src/database/schema/`:

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
- **Swagger**: http://localhost:3000/api
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

### Option 2: Local Development

### Development mode (recommended)

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

### Debug mode

To debug with the Node.js debugger:

```bash
pnpm run start:debug
```

## 📁 Project Structure

```
re-astr/
├── src/
│   ├── modules/           # Feature modules
│   │   ├── categories/    # Test categories management
│   │   ├── tests/         # Tests management
│   │   └── users/         # Users management
│   ├── auth/              # Authentication module (Better Auth)
│   ├── database/          # Drizzle ORM configuration
│   │   └── schema/        # Database schemas
│   ├── common/            # Shared utilities
│   ├── config/            # Application configuration
│   ├── utils/             # Utility functions
│   ├── app.module.ts      # Root module
│   └── main.ts            # Entry point (Fastify setup)
├── test/                  # E2E tests
├── drizzle/               # Generated migrations
├── dist/                  # Production build
├── .env                   # Environment variables (not versioned)
├── .env.example           # Configuration template
├── docker-compose.yml     # Docker configuration (MinIO)
├── drizzle.config.ts      # Drizzle configuration
├── jest.config.ts         # Jest configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## 📜 Available Scripts

### Development

```bash
pnpm run start:dev     # Start in watch mode (automatic reload)
pnpm run start         # Start normally
pnpm run start:debug   # Start with debugger
pnpm run start:prod    # Start in production
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
```

### Testing

```bash
pnpm run test          # Run unit tests
pnpm run test:watch    # Tests in watch mode
pnpm run test:cov      # Tests with code coverage
pnpm run test:debug    # Tests with debugger
pnpm run test:e2e      # End-to-end tests
```

### Code Quality

```bash
pnpm run lint          # Lint with ESLint (auto-fix)
pnpm run format        # Format with Prettier
```

## 🧪 Testing

The project uses **Jest** for unit and E2E tests.

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

### E2E Tests

```bash
pnpm test:e2e
```

### Naming conventions

- Unit tests: `*.spec.ts` (next to the tested file)
- E2E tests: in the `/test/` folder
- Mock data: `*.mock.ts`

## 📚 API Documentation

The interactive API documentation is automatically generated with **Swagger/OpenAPI**.

Once the server is started, access:

**http://localhost:3000/api**

You'll find:
- Complete list of endpoints
- Request/response schemas
- Ability to test APIs directly

## 🏗️ Modules

The project is organized into NestJS modules:

### `categories` - Categories Management

Management of test categories with custom validation schemas (Zod).

**Main endpoints**:
- `GET /categories` - List all categories
- `GET /categories/:id` - Get a category
- `POST /categories` - Create a category
- `PATCH /categories/:id` - Update a category
- `DELETE /categories/:id` - Delete a category

### `tests` - Tests Management

Management of tests with relationships to categories and files.

**Main endpoints**:
- `GET /tests` - List all tests
- `GET /tests/:id` - Get a test
- `POST /tests` - Create a test
- `PATCH /tests/:id` - Update a test
- `DELETE /tests/:id` - Delete a test

### `users` - Users Management

User management with role-based system (RBAC).

**Main endpoints**:
- `GET /users` - List all users
- `GET /users/:id` - Get a user
- `PATCH /users/:id` - Update a user
- `DELETE /users/:id` - Delete a user

### `auth` - Authentication

Authentication module based on **Better Auth** with:
- Email/password registration and login
- Session management
- Route protection via guards
- Role system (Admin, User, Viewer)

**Main endpoints**:
- `POST /api/auth/sign-up` - Registration
- `POST /api/auth/sign-in` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Current session