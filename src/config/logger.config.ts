import type { Params } from 'nestjs-pino'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,req,res,responseTime,reqId,context',
            messageFormat: '{levelLabel} \x1b[33m[{context}]\x1b[0m {msg}',
            singleLine: false,
            hideObject: true,
            customColors: 'trace:gray,debug:magenta,info:cyan,warn:yellow,error:red',
          },
        }
      : undefined,

    autoLogging: {
      ignore: (req) => ['/health', '/metrics'].some((path) => req.url?.startsWith(path)),
    },

    customProps: (req: any) => ({
      context: 'HTTP',
      requestId: req.id,
      userId: req.user?.id,
    }),

    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.confirmPassword',
        'req.body.currentPassword',
        'req.body.newPassword',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
  },
}
