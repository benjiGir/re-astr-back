import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['test/**/*.e2e-spec.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    globalSetup: './test/setup-testcontainers.ts',
    globalTeardown: './test/teardown-testcontainers.ts',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@modules': resolve(__dirname, './src/modules'),
      '@database': resolve(__dirname, './src/database'),
      '@common': resolve(__dirname, './src/common'),
      '@config': resolve(__dirname, './src/config'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },
});