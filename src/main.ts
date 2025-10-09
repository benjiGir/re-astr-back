import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { AppModule } from '@/app.module'
import { Swagger } from '@utils/swagger/swagger'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )

  await app.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET || 'your-secret-key'
  })

  await app.register(require('@fastify/multipart'), {
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

  await app.listen(3000)
}
bootstrap()
