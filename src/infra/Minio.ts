import type { Readable } from 'node:stream'
import { NodeStream } from '@effect/platform-node'
import { Client } from 'minio'
import { Config, Context, Effect, Layer, Redacted, Schema, Stream } from 'effect'
import { MinioConfig } from '@/infra/Config.js'

export class MinioError extends Schema.ErrorClass<MinioError>('re-astr/MinioError')(
  { _tag: Schema.tag('MinioError'), operation: Schema.String, cause: Schema.Unknown },
  { httpApiStatus: 500 },
) {}

export class Minio extends Context.Service<
  Minio,
  {
    readonly upload: (
      bucket: string,
      objectKey: string,
      filePath: string,
      metadata?: Record<string, string>,
    ) => Effect.Effect<{ readonly etag: string }, MinioError>
    readonly download: (bucket: string, objectKey: string) => Effect.Effect<Stream.Stream<Uint8Array, MinioError>, MinioError>
    readonly presignedUrl: (bucket: string, objectKey: string, expirySeconds: number) => Effect.Effect<string, MinioError>
    readonly remove: (bucket: string, objectKey: string) => Effect.Effect<void, MinioError>
  }
>()('Minio') {}

export const MinioLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* Config.all(MinioConfig)

    const client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: Redacted.value(config.accessKey),
      secretKey: Redacted.value(config.secretKey),
    })

    const ensureBucketExists = (bucket: string, operation: string) =>
      Effect.tryPromise({
        try: async () => {
          if (!(await client.bucketExists(bucket))) {
            await client.makeBucket(bucket)
          }
        },
        catch: (cause) => new MinioError({ operation, cause }),
      })

    return Layer.succeed(Minio, {
      upload: (bucket, objectKey, filePath, metadata) =>
        ensureBucketExists(bucket, 'upload').pipe(
          Effect.andThen(() =>
            Effect.tryPromise({
              try: () => client.fPutObject(bucket, objectKey, filePath, metadata),
              catch: (cause) => new MinioError({ operation: 'upload', cause }),
            }),
          ),
          Effect.map((info) => ({ etag: info.etag })),
        ),

      download: (bucket, objectKey) =>
        Effect.tryPromise({
          try: () => client.getObject(bucket, objectKey),
          catch: (cause) => new MinioError({ operation: 'download', cause }),
        }).pipe(
          Effect.map((readable: Readable) =>
            NodeStream.fromReadable<Uint8Array, MinioError>({
              evaluate: () => readable,
              onError: (cause) => new MinioError({ operation: 'download', cause }),
            }),
          ),
        ),

      presignedUrl: (bucket, objectKey, expirySeconds) =>
        Effect.tryPromise({
          try: () => client.presignedGetObject(bucket, objectKey, expirySeconds),
          catch: (cause) => new MinioError({ operation: 'presignedUrl', cause }),
        }),

      remove: (bucket, objectKey) =>
        Effect.tryPromise({
          try: () => client.removeObject(bucket, objectKey),
          catch: (cause) => new MinioError({ operation: 'remove', cause }),
        }),
    })
  }),
)
