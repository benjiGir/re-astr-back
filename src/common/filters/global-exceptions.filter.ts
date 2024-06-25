import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { Prisma } from '@prisma/client'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  logger = new Logger('GlobalExceptionFilter')

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  private prismaKnownRequestStatus(
    exception: Prisma.PrismaClientKnownRequestError,
  ) {
    switch (exception.code) {
      case 'P2000':
      case 'P2001':
      case 'P2023':
        return HttpStatus.BAD_REQUEST
      case 'P2002':
        return HttpStatus.CONFLICT
      case 'P2025':
        return HttpStatus.NOT_FOUND
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR
    }
  }

  private prismaFilter(exception: unknown): HttpStatus {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return HttpStatus.UNPROCESSABLE_ENTITY
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.prismaKnownRequestStatus(exception)
    } else {
      return HttpStatus.BAD_REQUEST
    }
  }

  private isPrismaException(exception: unknown): boolean {
    return (
      exception instanceof Prisma.PrismaClientValidationError ||
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientRustPanicError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError
    )
  }

  catch(exception: any, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost

    const ctx = host.switchToHttp()
    const path = httpAdapter.getRequestUrl(ctx.getRequest())
    const method = httpAdapter.getRequestMethod(ctx.getRequest())
    const responseBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: '',
    }

    this.logger.error(
      `Error in endpoint ${path} for method ${method}`,
      exception,
    )

    if (exception instanceof HttpException) {
      return httpAdapter.reply(
        ctx.getResponse(),
        exception.getResponse(),
        exception.getStatus(),
      )
    }

    if (this.isPrismaException(exception)) {
      responseBody.statusCode = this.prismaFilter(exception)
    }

    if (
      typeof exception === 'object' &&
      exception !== null &&
      'message' in exception &&
      typeof exception.message === 'string'
    ) {
      responseBody.message = exception.message
    }
    httpAdapter.reply(ctx.getResponse(), responseBody, responseBody.statusCode)
  }
}
