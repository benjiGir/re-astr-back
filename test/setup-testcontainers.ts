import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

let container: StartedPostgreSqlContainer;

/**
 * Global setup for E2E tests
 * Starts a PostgreSQL container and applies migrations
 */
export default async function globalSetup() {
  // Disable logging before any modules are loaded
  process.env.LOG_LEVEL = 'silent';
  process.env.NODE_ENV = 'test';

  console.log('\n🐳 Starting PostgreSQL container for E2E tests...\n');

  // Start PostgreSQL container
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('re-astr-test')
    .withUsername('test-user')
    .withPassword('test-password')
    .withExposedPorts(5432)
    .start();

  const connectionString = container.getConnectionUri();

  console.log(`✅ PostgreSQL container started`);
  console.log(`📍 Connection: ${connectionString}\n`);

  // Store connection string for tests to use
  process.env.DATABASE_URL = connectionString;
  global.__TESTCONTAINERS_POSTGRES_URI__ = connectionString;
  global.__TESTCONTAINERS_CONTAINER__ = container;

  // Write to temporary file as backup (in case env vars don't propagate)
  const tmpDir = path.join(__dirname, '.tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(tmpDir, 'test-db-url.txt'),
    connectionString,
    'utf-8',
  );

  // Apply migrations
  console.log('🔄 Applying database migrations...\n');

  try {
    const migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient);

    await migrate(db, {
      migrationsFolder: path.join(__dirname, '../drizzle'),
    });

    await migrationClient.end();

    console.log('✅ Migrations applied successfully\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }

  console.log('🚀 Test environment ready!\n');
}