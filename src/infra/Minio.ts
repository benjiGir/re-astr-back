import { NodeStream } from '@effect/platform-node'
import { Client } from 'minio'
import { Config, Context, Effect, Layer, Redacted, Schema, Stream } from 'effect'
import { MinioConfig } from '@/infra/Config.js'

export class MinioError extends Schema.TaggedErrorClass<MinioError>('re-astr/MinioError')(
  'MinioError',
  { operation: Schema.String, cause: Schema.Unknown },
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

export const MinioLive = Layer.effect(
  Minio,
  Effect.gen(function* () {
    const config = yield* Config.all(MinioConfig)

    const client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: Redacted.value(config.accessKey),
      secretKey: Redacted.value(config.secretKey),
    })

    const ensureBucketExists = Effect.fn('Minio.ensureBucketExists')(function* (bucket: string, operation: string) {
      yield* Effect.tryPromise({
        try: async () => {
          if (!(await client.bucketExists(bucket))) {
            await client.makeBucket(bucket)
          }
        },
        catch: (cause) => new MinioError({ operation, cause }),
      })
    })

    const upload = Effect.fn('Minio.upload')(function* (
      bucket: string,
      objectKey: string,
      filePath: string,
      metadata?: Record<string, string>,
    ) {
      yield* ensureBucketExists(bucket, 'upload')
      const info = yield* Effect.tryPromise({
        try: () => client.fPutObject(bucket, objectKey, filePath, metadata),
        catch: (cause) => new MinioError({ operation: 'upload', cause }),
      })
      return { etag: info.etag }
    })

    const download = Effect.fn('Minio.download')(function* (bucket: string, objectKey: string) {
      const readable = yield* Effect.tryPromise({
        try: () => client.getObject(bucket, objectKey),
        catch: (cause) => new MinioError({ operation: 'download', cause }),
      })
      return NodeStream.fromReadable<Uint8Array, MinioError>({
        evaluate: () => readable,
        onError: (cause) => new MinioError({ operation: 'download', cause }),
      })
    })

    const presignedUrl = Effect.fn('Minio.presignedUrl')(function* (
      bucket: string,
      objectKey: string,
      expirySeconds: number,
    ) {
      return yield* Effect.tryPromise({
        try: () => client.presignedGetObject(bucket, objectKey, expirySeconds),
        catch: (cause) => new MinioError({ operation: 'presignedUrl', cause }),
      })
    })

    const remove = Effect.fn('Minio.remove')(function* (bucket: string, objectKey: string) {
      return yield* Effect.tryPromise({
        try: () => client.removeObject(bucket, objectKey),
        catch: (cause) => new MinioError({ operation: 'remove', cause }),
      })
    })

    return { upload, download, presignedUrl, remove }
  }),
)
