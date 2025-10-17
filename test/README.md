# E2E Testing with Testcontainers

This directory contains end-to-end tests for the RE-ASTR application using **Testcontainers** for database isolation.

## 🐳 How It Works

1. **Testcontainers starts a PostgreSQL container** before all tests
2. **Drizzle migrations are applied** to the container database
3. **Tests run** against the isolated database
4. **Container is destroyed** after all tests complete

This ensures:
- ✅ **Zero impact on development database**
- ✅ **Reproducible test environment**
- ✅ **CI/CD compatible**

## 📁 Structure

```
test/
├── helpers/
│   ├── factories/           # Faker-based data factories
│   │   ├── user.factory.ts
│   │   ├── category.factory.ts
│   │   └── test.factory.ts
│   ├── test-app.helper.ts   # App setup & DB cleanup
│   └── auth.helper.ts       # Authentication utilities
├── auth.e2e-spec.ts         # Authentication flow tests
├── rbac.e2e-spec.ts         # RBAC permissions tests
├── setup-testcontainers.ts  # Global setup
├── teardown-testcontainers.ts # Global teardown
└── global.d.ts              # TypeScript declarations
```

## 🚀 Running Tests

### Run all E2E tests
```bash
pnpm run test:e2e
```

### Run specific test file
```bash
pnpm run test:e2e auth.e2e-spec.ts
```

### Run with coverage
```bash
pnpm run test:e2e -- --coverage
```

## 🔧 Requirements

- **Docker** must be running (Testcontainers uses Docker to start PostgreSQL)
- **Migrations** in `/drizzle` directory must be up-to-date

## 📝 Writing Tests

### Using Factories

```typescript
import { UserFactory, CategoryFactory } from './helpers/factories';

// Generate random user data
const userData = UserFactory.build();
const masterUser = UserFactory.buildMaster();

// Generate random category data
const categoryData = CategoryFactory.build();
```

### Using Auth Helpers

```typescript
import { createAuthenticatedUser, signIn } from './helpers/auth.helper';

// Create user with specific role and get auth cookie
const user = await createAuthenticatedUser(app, UserFactory.buildContributor());

// Use cookie for authenticated requests
await request(app.getHttpServer())
  .get('/categories')
  .set('Cookie', user.cookie)
  .set('x-user-role', user.role)
  .expect(200);
```

### Cleaning Database

Each test should clean the database in `beforeEach`:

```typescript
beforeEach(async () => {
  await cleanDatabase(app);
});
```

## 🛡️ Safety Checks

The test setup includes safety checks to prevent accidental data loss:

- ✅ Verifies database URL contains `re-astr-test`
- ✅ Confirms database is running in a container
- ✅ Throws error if production/dev database is detected

## 🎯 Test Coverage

Current E2E test files:

- ✅ **auth.e2e-spec.ts** - Sign-up, sign-in, session, sign-out
- ✅ **rbac.e2e-spec.ts** - Role-based access control for all endpoints

## 🐛 Troubleshooting

### Container fails to start
```bash
# Check if Docker is running
docker ps

# Check Docker daemon
docker info
```

### Migrations fail
```bash
# Ensure migrations are up-to-date
pnpm run db:generate

# Check migrations directory
ls drizzle/
```

### Tests timeout
- Increase timeout in `jest-e2e.json` (`testTimeout`)
- Check Docker resources (CPU/Memory)

## 📚 Resources

- [Testcontainers Documentation](https://testcontainers.com/)
- [Jest E2E Testing](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing)
- [Drizzle Migrations](https://orm.drizzle.team/docs/migrations)