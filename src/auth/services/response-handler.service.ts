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
      // Gérer les cookies Set-Cookie de manière spéciale pour Fastify
      if (key.toLowerCase() === 'set-cookie') {
        // Better Auth peut envoyer plusieurs cookies
        // Le header Set-Cookie peut être une seule valeur ou un tableau
        const cookies = Array.isArray(value) ? value : [value]

        cookies.forEach((cookieString) => {
          // Parser le cookie string pour extraire name, value et options
          const [nameValue, ...optionsParts] = cookieString.split(';').map(s => s.trim())
          const [name, val] = nameValue.split('=')

          // Parser les options du cookie
          const options: any = {}
          optionsParts.forEach(part => {
            const [optKey, optValue] = part.split('=').map(s => s?.trim())
            const lowerKey = optKey.toLowerCase()

            if (lowerKey === 'path') options.path = optValue
            else if (lowerKey === 'domain') options.domain = optValue
            else if (lowerKey === 'max-age') options.maxAge = parseInt(optValue)
            else if (lowerKey === 'expires') options.expires = new Date(optValue)
            else if (lowerKey === 'httponly') options.httpOnly = true
            else if (lowerKey === 'secure') options.secure = true
            else if (lowerKey === 'samesite') options.sameSite = optValue.toLowerCase()
          })

          // Définir le cookie avec Fastify
          fastifyReply.setCookie(name, val, options)
        })
      } else {
        // Pour les autres headers, utiliser la méthode normale
        fastifyReply.header(key, value)
      }
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