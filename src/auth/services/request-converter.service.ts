import { Injectable } from '@nestjs/common'
import {FastifyRequest} from "fastify";

@Injectable()
export class RequestConverterService {
  /**
   * Convertit une requête Fastify en objet Request compatible avec Better Auth
   */
  convertFastifyToBetterAuth(fastifyRequest: FastifyRequest): Request {
    // Construire l'URL complète pour Better Auth
    // Better Auth attend le path complet incluant le basePath (/auth)
    const host = fastifyRequest.headers.host || 'localhost:3000'
    const protocol = fastifyRequest.headers['x-forwarded-proto'] || 'http'
    const fullPath = `/auth${fastifyRequest.url}`
    const url = new URL(fullPath, `${protocol}://${host}`)

    const headers = this.convertHeaders(fastifyRequest.headers)

    const requestInit: RequestInit = {
      method: fastifyRequest.method,
      headers,
    }

    // Ajouter le body pour les requêtes POST/PUT/PATCH
    if (this.hasBody(fastifyRequest.method) && fastifyRequest.body) {
      requestInit.body = JSON.stringify(fastifyRequest.body)
      headers.set('content-type', 'application/json')
    }

    return new Request(url.toString(), requestInit)
  }

  /**
   * Convertit les headers Fastify en objet Headers standard
   */
  private convertHeaders(fastifyHeaders: any): Headers {
    const headers = new Headers()

    for (const [key, value] of Object.entries(fastifyHeaders)) {
      if (typeof value === 'string') {
        headers.set(key, value)
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(', '))
      }
    }

    return headers
  }

  /**
   * Détermine si la méthode HTTP peut avoir un body
   */
  private hasBody(method: string): boolean {
    return !['GET', 'HEAD', 'DELETE'].includes(method.toUpperCase())
  }
}