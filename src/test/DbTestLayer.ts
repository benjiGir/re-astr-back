import { ConfigProvider, Layer } from 'effect'
import { Pool } from 'pg'
import { DatabaseLive } from '@/infra/Database.js'
import { readTestEnv } from '@/test/testEnv.js'

/** The real `DatabaseLive` construction, pointed at the containerized test Postgres. */
export const DatabaseTestLive = DatabaseLive.pipe(
  Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(readTestEnv()))),
)

const TABLES = [
  'sessions',
  'verifications',
  'accounts',
  'test_files',
  'tests',
  'categories',
  'projects',
  'users',
] as const

let pool: Pool | undefined
const getPool = (): Pool => (pool ??= new Pool({ connectionString: readTestEnv().DATABASE_URL }))

/** Row-level isolation between tests sharing the one containerized Postgres for the whole run. */
export const truncateAll = async (): Promise<void> => {
  await getPool().query(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`)
}
