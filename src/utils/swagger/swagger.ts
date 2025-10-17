import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

export class Swagger {
  static setup(app: NestFastifyApplication) {
    const swaggerOptions = new DocumentBuilder()
      .setTitle('RE-ASTR API Documentation')
      .setVersion('1.0')
      .setDescription('API documentation for RE-ASTR (Automotive Software Testing Results)')
      .addCookieAuth(
        'better-auth.session_token',
        {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
          description: 'Session token cookie from Better Auth',
        },
        'cookie-auth',
      )
      .build()

    const document = SwaggerModule.createDocument(app, swaggerOptions)
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // Garde l'authentification après rafraîchissement
      },
    })
  }
}
