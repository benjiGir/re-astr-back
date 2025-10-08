import { registerAs } from '@nestjs/config'

export default registerAs('app', () => ({
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  cookieSecret: process.env.COOKIE_SECRET,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  sessionExpiresIn: process.env.AUTH_SESSION_EXPIRES,
  sessionUpdateAge: process.env.AUTH_SESSION_UPDATE_AGE,
  emailPasswordEnabled: process.env.AUTH_EMAIL_PASSWORD_ENABLED,
  emailPasswordRequireEmailVerification: process.env.AUTH_EMAIL_PASSWORD_REQUIRE_EMAIL_VERIFICATION,
}))
