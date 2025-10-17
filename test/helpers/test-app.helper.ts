import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';
import { HealthModule } from '@/health/health.module';
import { DatabaseService } from '@database/database.service';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Empty mock module to replace HealthModule
@Module({})
class MockHealthModule {}

/**
 * Get the test database URL from Testcontainers
 * Falls back to reading from temporary file if global var not available
 */
function getTestDatabaseUrl(): string {
  // Try global variable first
  if (global.__TESTCONTAINERS_POSTGRES_URI__) {
    return global.__TESTCONTAINERS_POSTGRES_URI__;
  }

  // Try environment variable
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Try reading from temp file (backup)
  const tmpFile = path.join(__dirname, '../.tmp/test-db-url.txt');
  if (fs.existsSync(tmpFile)) {
    return fs.readFileSync(tmpFile, 'utf-8').trim();
  }

  throw new Error(
    'Test database URL not found. Make sure globalSetup ran successfully.',
  );
}

/**
 * Verify we are using a test database and not production/development
 */
function ensureTestDatabase(): void {
  const dbUrl = getTestDatabaseUrl();

  // Safety checks
  if (!dbUrl.includes('re-astr-test') && !dbUrl.includes('localhost')) {
    throw new Error(
      `❌ SAFETY CHECK FAILED: Database URL does not appear to be a test database!\n` +
        `URL: ${dbUrl}\n` +
        `E2E tests should only run against Testcontainers databases.`,
    );
  }

  // Override DATABASE_URL to ensure tests use the container
  process.env.DATABASE_URL = dbUrl;
}

/**
 * Setup a NestJS application for E2E testing
 * Configures Fastify adapter, validation, and disables auth guards
 */
export async function setupTestApp(): Promise<INestApplication> {
  // Ensure we're using the test database
  ensureTestDatabase();

  // Disable logging for tests
  process.env.LOG_LEVEL = 'silent';

  // Use real AppModule with silent logs and override HealthModule
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(HealthModule)
    .useModule(MockHealthModule)
    .compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );

  // Enable validation pipe (like in main.ts)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Enable CORS for testing
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}

/**
 * Clean all test data from the database
 * Preserves schema structure, only deletes data
 */
export async function cleanDatabase(app: INestApplication): Promise<void> {
  const databaseService = app.get(DatabaseService);
  const db = databaseService.getDatabase();

  // Delete in reverse order of dependencies to avoid foreign key constraints
  await db.execute(sql`TRUNCATE TABLE test_files CASCADE`);
  await db.execute(sql`TRUNCATE TABLE tests CASCADE`);
  await db.execute(sql`TRUNCATE TABLE categories CASCADE`);
  await db.execute(sql`TRUNCATE TABLE verifications CASCADE`);
  await db.execute(sql`TRUNCATE TABLE sessions CASCADE`);
  await db.execute(sql`TRUNCATE TABLE accounts CASCADE`);
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
}

/**
 * Close the application and cleanup resources
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  await app.close();
}