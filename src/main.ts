import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exceptions.filter'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  )

  const httpAdapterHost = app.get('httpAdapterHost')
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost))

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  await app.listen(3000)
}
bootstrap()
