import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // Root-only option (can't be set per-project): the e2e project's specs
    // share one containerized Postgres, so files must not run concurrently —
    // poolOptions.singleThread alone still let vitest interleave separate
    // files' async tests within that thread and corrupt shared state.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      // Bootstrap/DI wiring with no branch logic worth testing — see plan notes.
      // domain/schema is Drizzle table/column definitions (declarative, not
      // logic) — its only "functions" are $onUpdateFn callbacks that v8
      // coverage can't attribute to a call site even though every Repo
      // update test exercises them.
      exclude: [
        'src/main.ts',
        'src/App.ts',
        'src/Seed.ts',
        'src/infra/Telemetry.ts',
        'src/domain/schema/**',
        'src/test/**',
        'src/**/*.spec.ts',
        'src/**/*.e2e-spec.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*Repo.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['src/**/*.e2e-spec.ts', 'src/**/*Repo.spec.ts'],
          globalSetup: ['src/test/containers.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
