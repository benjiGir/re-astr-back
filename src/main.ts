import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import { Swagger } from './utils/swagger/swagger'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )

  // Register Fastify plugins for Better Auth support
  await app.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET || 'your-secret-key'
  })

  // Enable CORS for authentication
  app.enableCors({
    origin: true,
    credentials: true,
  })

  Swagger.setup(app)

  await app.listen(3000)
}
bootstrap()
