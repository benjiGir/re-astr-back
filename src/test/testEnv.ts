import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Handoff between vitest's `globalSetup` (a separate process/context from
 * test files — env vars set there don't propagate) and the test files
 * themselves: `containers.ts` writes the started containers' connection info
 * here once per run, and every test file reads it back synchronously.
 */
export const TEST_ENV_PATH = path.join(os.tmpdir(), 're-astr-test-env.json')

export interface TestEnv {
  readonly DATABASE_URL: string
  readonly STORAGE_ENDPOINT: string
  readonly STORAGE_REGION: string
  readonly STORAGE_ACCESS_KEY_ID: string
  readonly STORAGE_SECRET_ACCESS_KEY: string
}

export const readTestEnv = (): TestEnv => JSON.parse(readFileSync(TEST_ENV_PATH, 'utf-8'))
