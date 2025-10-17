import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for E2E tests
 * Stops and removes the PostgreSQL container
 */
export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up test environment...\n');

  const container = global.__TESTCONTAINERS_CONTAINER__;

  if (container) {
    console.log('🛑 Stopping PostgreSQL container...');
    await container.stop();
    console.log('✅ Container stopped\n');
  }

  // Cleanup temporary files
  const tmpDir = path.join(__dirname, '.tmp');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('✨ Cleanup complete!\n');
}