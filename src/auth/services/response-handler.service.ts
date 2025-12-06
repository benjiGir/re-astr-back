import { LoggerService } from '@common/logger/logger.service'
import { Injectable } from '@nestjs/common'
import { AppConfigService } from '../../config/app/config.service'

@Injectable()
export class ResponseHandlerService {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ResponseHandlerService.name)
  }

  async handleBetterAuthResponse(response: any, fastifyReply: any): Promise<void> {
    if (response instanceof Response) {
      await this.handleWebApiResponse(response, fastifyReply)
    } else {
      await this.handleDirectResponse(response, fastifyReply)
    }
  }

  private async handleWebApiResponse(response: Response, fastifyReply: any): Promise<void> {
    const status = response.status
    const body = await response.text()

    this.copyResponseHeaders(response, fastifyReply)

    fastifyReply.status(status).send(body)
  }

  private async handleDirectResponse(response: any, fastifyReply: any): Promise<void> {
    await fastifyReply.status(200).send(response)
  }

  private copyResponseHeaders(response: Response, fastifyReply: any): void {
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        const cookies = Array.isArray(value) ? value : [value]

        cookies.forEach((cookieString) => {
          const [nameValue, ...optionsParts] = cookieString.split(';').map((s: string) => s.trim())
          const [name, val] = nameValue.split('=')

          const options: any = {}
          optionsParts.forEach((part: string) => {
            const [optKey, optValue] = part.split('=').map((s: string) => s?.trim())
            const lowerKey = optKey.toLowerCase()

            if (lowerKey === 'path') options.path = optValue
            else if (lowerKey === 'domain') options.domain = optValue
            else if (lowerKey === 'max-age') options.maxAge = Number.parseInt(optValue)
            else if (lowerKey === 'expires') options.expires = new Date(optValue)
            else if (lowerKey === 'httponly') options.httpOnly = true
            else if (lowerKey === 'secure') options.secure = true
            else if (lowerKey === 'samesite') options.sameSite = optValue.toLowerCase()
          })

          fastifyReply.setCookie(name, val, options)
        })
      } else {
        fastifyReply.header(key, value)
      }
    })
  }

  handleAuthError(
    error: any,
    fastifyReply: any,
    requestInfo?: { url: string; method: string },
  ): void {
    this.logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        url: requestInfo?.url,
        method: requestInfo?.method,
      },
      'Better Auth error',
    )

    const errorResponse: any = {
      error: 'Authentication error',
    }

    if (this.appConfigService.env === 'development' && requestInfo) {
      errorResponse.details = error.message
      errorResponse.url = requestInfo.url
      errorResponse.method = requestInfo.method
    }

    fastifyReply.status(500).send(errorResponse)
  }

  handleServiceNotReady(fastifyReply: any): void {
    fastifyReply.status(503).send({
      error: 'Authentication service not ready',
    })
  }
}
