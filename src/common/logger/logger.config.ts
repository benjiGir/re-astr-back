import type { Params } from 'nestjs-pino'

const isProduction = process.env.NODE_ENV === 'production'

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
      bindings: (bindings) => ({ pid: bindings.pid }),
    },
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,req,res,responseTime,reqId,context',
        messageFormat: '\x1b[33m[{context}]\x1b[0m {msg}',
        hideObject: true,
        customColors: 'trace:gray,debug:magenta,info:cyan,warn:yellow,error:red',
      },
    },

    autoLogging: {
      ignore: (req) => ['/metrics'].some((path) => req.url?.startsWith(path)),
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
