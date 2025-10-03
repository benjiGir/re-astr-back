import { registerAs } from '@nestjs/config'

export default registerAs('app', () => ({
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  cookieSecret: process.env.COOKIE_SECRET,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
}))
