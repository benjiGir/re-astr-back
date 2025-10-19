import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { Swagger } from '@utils/swagger/swagger'
import { Logger } from 'nestjs-pino'
import pino from 'pino'
import { AppModule } from '@/app.module'

const bootstrapLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  })

  app.useLogger(app.get(Logger))

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'your-secret-key',
  })

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 10,
    },
  })

  app.enableCors({
    origin: true,
    credentials: true,
  })

  Swagger.setup(app)

  const port = process.env.PORT || 3000
  await app.listen(port, '0.0.0.0')

  bootstrapLogger.info({ port }, `🚀 Application is running on: http://localhost:${port}`)
  bootstrapLogger.info(
    { port, apiUrl: `http://localhost:${port}/docs` },
    `📚 API Documentation available at: http://localhost:${port}/docs`,
  )
}
bootstrap()
