import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

export class Swagger {
  static setup(app: NestFastifyApplication) {
    const swaggerOptions = new DocumentBuilder()
      .setTitle('Swagger Documentation')
      .setVersion('1.0')
      .setDescription('Swagger Documentation')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerOptions)
    SwaggerModule.setup('docs', app, document, {})
  }
}
