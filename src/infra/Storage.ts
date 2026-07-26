import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Config, Context, Effect, Layer, Redacted, Schema, Stream } from 'effect'
import { StorageConfig } from '@/infra/Config.js'

export class StorageError extends Schema.TaggedErrorClass<StorageError>('re-astr/StorageError')(
  'StorageError',
  { operation: Schema.String, cause: Schema.Unknown },
  { httpApiStatus: 500 },
) {}

export class Storage extends Context.Service<
  Storage,
  {
    readonly upload: (
      bucket: string,
      objectKey: string,
      filePath: string,
      metadata?: Record<string, string>,
    ) => Effect.Effect<{ readonly etag: string }, StorageError>
    readonly download: (
      bucket: string,
      objectKey: string,
    ) => Effect.Effect<Stream.Stream<Uint8Array, StorageError>, StorageError>
    readonly presignedUrl: (
      bucket: string,
      objectKey: string,
      expirySeconds: number,
    ) => Effect.Effect<string, StorageError>
    readonly remove: (bucket: string, objectKey: string) => Effect.Effect<void, StorageError>
  }
>()('Storage') {}

export const StorageLive = Layer.effect(
  Storage,
  Effect.gen(function* () {
    const config = yield* Config.all(StorageConfig)

    // Garage (and most self-hosted S3-compatible backends) require path-style
    // addressing — virtual-hosted-style (bucket.endpoint) needs DNS wildcarding
    // these backends don't provide.
    const client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: Redacted.value(config.accessKeyId),
        secretAccessKey: Redacted.value(config.secretAccessKey),
      },
    })

    const upload = Effect.fn('Storage.upload')(function* (
      bucket: string,
      objectKey: string,
      filePath: string,
      metadata?: Record<string, string>,
    ) {
      const { size } = yield* Effect.tryPromise({
        try: () => stat(filePath),
        catch: (cause) => new StorageError({ operation: 'upload', cause }),
      })

      const response = yield* Effect.tryPromise({
        try: () =>
          client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: objectKey,
              Body: createReadStream(filePath),
              ContentLength: size,
              ContentType: metadata?.['content-type'],
              Metadata: metadata,
            }),
          ),
        catch: (cause) => new StorageError({ operation: 'upload', cause }),
      })

      return { etag: (response.ETag ?? '').replaceAll('"', '') }
    })

    const download = Effect.fn('Storage.download')(function* (bucket: string, objectKey: string) {
      const response = yield* Effect.tryPromise({
        try: () => client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey })),
        catch: (cause) => new StorageError({ operation: 'download', cause }),
      })

      if (response.Body === undefined) {
        return yield*
          new StorageError({ operation: 'download', cause: 'response has no body' })
      }
      const body = response.Body

      return Stream.fromReadableStream<Uint8Array, StorageError>({
        evaluate: () => body.transformToWebStream(),
        onError: (cause) => new StorageError({ operation: 'download', cause }),
      })
    })

    const presignedUrl = Effect.fn('Storage.presignedUrl')(function* (
      bucket: string,
      objectKey: string,
      expirySeconds: number,
    ) {
      return yield* Effect.tryPromise({
        try: () =>
          getSignedUrl(
            client,
            new GetObjectCommand({
              Bucket: bucket,
              Key: objectKey,
              // Forces the browser to download rather than render the object inline —
              // download() does this via an explicit response header (TestFilesHttp.ts),
              // but a presigned URL serves straight from the storage origin with no
              // handler in between, so it has to be baked into the signed request itself.
              ResponseContentDisposition: 'attachment',
            }),
            { expiresIn: expirySeconds },
          ),
        catch: (cause) => new StorageError({ operation: 'presignedUrl', cause }),
      })
    })

    const remove = Effect.fn('Storage.remove')(function* (bucket: string, objectKey: string) {
      yield* Effect.tryPromise({
        try: () => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })),
        catch: (cause) => new StorageError({ operation: 'remove', cause }),
      })
    })

    return { upload, download, presignedUrl, remove }
  }),
)
