import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from '@effect/vitest'
import { ConfigProvider, Effect, Layer } from 'effect'
import { Storage, StorageError, StorageLive } from '@/infra/Storage.js'

const tempDir = mkdtempSync(join(tmpdir(), 'storage-spec-'))
const tempFilePath = join(tempDir, 'report.pdf')
writeFileSync(tempFilePath, 'fake pdf content')

// Port 1 is a reserved port nothing listens on — connections fail fast with
// ECONNREFUSED, which is what exercises Storage's tryPromise `catch` handlers.
const UnreachableStorageLive = StorageLive.pipe(
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({
        STORAGE_ENDPOINT: 'http://127.0.0.1:1',
        STORAGE_REGION: 'test',
        STORAGE_ACCESS_KEY_ID: 'test',
        STORAGE_SECRET_ACCESS_KEY: 'test',
      }),
    ),
  ),
)

const runUnreachable = <A, E>(effect: Effect.Effect<A, E, Storage>) =>
  Effect.provide(effect, UnreachableStorageLive)

describe('Storage', () => {
  it.effect('upload fails with StorageError when the endpoint is unreachable', () =>
    runUnreachable(
      Effect.gen(function* () {
        const storage = yield* Storage
        const error = yield* Effect.flip(storage.upload('bucket', 'key', tempFilePath))
        expect(error).toBeInstanceOf(StorageError)
        expect(error.operation).toBe('upload')
      }),
    ),
  )

  it.effect('download fails with StorageError when the endpoint is unreachable', () =>
    runUnreachable(
      Effect.gen(function* () {
        const storage = yield* Storage
        const error = yield* Effect.flip(storage.download('bucket', 'key'))
        expect(error).toBeInstanceOf(StorageError)
        expect(error.operation).toBe('download')
      }),
    ),
  )

  it.effect('remove fails with StorageError when the endpoint is unreachable', () =>
    runUnreachable(
      Effect.gen(function* () {
        const storage = yield* Storage
        const error = yield* Effect.flip(storage.remove('bucket', 'key'))
        expect(error).toBeInstanceOf(StorageError)
        expect(error.operation).toBe('remove')
      }),
    ),
  )
})
