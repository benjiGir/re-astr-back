import { Injectable } from '@nestjs/common'
import { AppConfigService } from '../../config/app/config.service'

@Injectable()
export class ResponseHandlerService {
  constructor(private readonly appConfigService: AppConfigService) {}

  /**
   * Traite la réponse de Better Auth et l'envoie via Fastify
   */
  async handleBetterAuthResponse(response: any, fastifyReply: any): Promise<void> {
    if (response instanceof Response) {
      await this.handleWebApiResponse(response, fastifyReply)
    } else {
      await this.handleDirectResponse(response, fastifyReply)
    }
  }

  /**
   * Gère les réponses de type Web API Response
   */
  private async handleWebApiResponse(response: Response, fastifyReply: any): Promise<void> {
    const status = response.status
    const body = await response.text()

    // Copier tous les headers de la réponse
    this.copyResponseHeaders(response, fastifyReply)

    fastifyReply.status(status).send(body)
  }

  /**
   * Gère les réponses directes (non-Response objects)
   */
  private async handleDirectResponse(response: any, fastifyReply: any): Promise<void> {
    fastifyReply.status(200).send(response)
  }

  /**
   * Copie les headers de la réponse Better Auth vers Fastify
   */
  private copyResponseHeaders(response: Response, fastifyReply: any): void {
    response.headers.forEach((value, key) => {
      fastifyReply.header(key, value)
    })
  }

  /**
   * Gère les erreurs d'authentification
   */
  handleAuthError(error: any, fastifyReply: any, requestInfo?: { url: string; method: string }): void {
    console.error('Better Auth error:', error)

    const errorResponse: any = {
      error: 'Authentication error'
    }

    // En développement, ajouter plus de détails
    if (this.appConfigService.env === 'development' && requestInfo) {
      errorResponse.details = error.message
      errorResponse.url = requestInfo.url
      errorResponse.method = requestInfo.method
    }

    fastifyReply.status(500).send(errorResponse)
  }

  /**
   * Gère le cas où le service d'authentification n'est pas prêt
   */
  handleServiceNotReady(fastifyReply: any): void {
    fastifyReply.status(503).send({
      error: 'Authentication service not ready'
    })
  }
}