import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { MinioContainer } from '@testcontainers/minio'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { BUCKET } from '@/modules/test-files/TestFilesService.js'
import { TEST_ENV_PATH } from '@/test/testEnv.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATION_PATH = path.join(dirname, '../../drizzle/20260717133438_baseline/migration.sql')

/** vitest globalSetup: runs once for the whole run, before any test file is loaded. */
export default async function setup() {
  const [postgres, minio] = await Promise.all([
    new PostgreSqlContainer('postgres:17-alpine').start(),
    new MinioContainer('minio/minio:latest').start(),
  ])

  const databaseUrl = postgres.getConnectionUri()
  const migrationSql = await readFile(MIGRATION_PATH, 'utf-8')
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  await client.query(migrationSql.replaceAll('--> statement-breakpoint', ''))
  await client.end()

  const storageEndpoint = minio.getConnectionUrl()
  const storageAccessKeyId = minio.getUsername()
  const storageSecretAccessKey = minio.getPassword()

  const s3 = new S3Client({
    endpoint: storageEndpoint,
    region: 'test',
    forcePathStyle: true,
    credentials: { accessKeyId: storageAccessKeyId, secretAccessKey: storageSecretAccessKey },
  })
  await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))

  await writeFile(
    TEST_ENV_PATH,
    JSON.stringify({
      DATABASE_URL: databaseUrl,
      STORAGE_ENDPOINT: storageEndpoint,
      STORAGE_REGION: 'test',
      STORAGE_ACCESS_KEY_ID: storageAccessKeyId,
      STORAGE_SECRET_ACCESS_KEY: storageSecretAccessKey,
    }),
  )

  return async () => {
    await rm(TEST_ENV_PATH, { force: true })
    await Promise.all([postgres.stop(), minio.stop()])
  }
}
