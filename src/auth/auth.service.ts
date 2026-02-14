import { LoggerService } from '@common/logger/logger.service'
import { AppConfigService } from '@config/app/config.service'
import { DatabaseConfigService } from '@config/database/config.service'
import { accounts } from '@database/schema/accounts.schema'
import { sessions } from '@database/schema/sessions.schema'
import { users } from '@database/schema/users.schema'
import { verifications } from '@database/schema/verifications.schema'
import { Injectable, type OnModuleInit } from '@nestjs/common'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import argon2 from "argon2";

@Injectable()
export class AuthService implements OnModuleInit {
  public auth!: ReturnType<typeof betterAuth>
  private db!: ReturnType<typeof drizzle>

  constructor(
    private readonly appConfigServie: AppConfigService,
    private readonly databaseConfigService: DatabaseConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AuthService.name)
  }

  onModuleInit() {
    this.logger.info('Initializing Better Auth service')

    const connection = postgres(this.databaseConfigService.url)
    this.db = drizzle(connection, { schema: { users, sessions } })

    this.auth = betterAuth({
      advanced: {
        database: {
          generateId: false,
        },
      },
      database: drizzleAdapter(this.db, {
        usePlural: true,
        provider: 'pg',
        schema: {
          users: users,
          sessions: sessions,
          accounts: accounts,
          verifications: verifications,
        },
      }),
      emailAndPassword: {
        enabled: this.appConfigServie.emailPasswordEnabled,
        requireEmailVerification: this.appConfigServie.emailPasswordRequireEmailVerification,
        password: {
          // Fonction custom pour hasher
          hash: async (password: string) => {
            return await argon2.hash(password);
          },

          // Fonction custom pour vérifier
          verify: async ({hash, password}) => {
            return await argon2.verify(hash, password);
          }
        }

      },
      session: {
        expiresIn: this.appConfigServie.sessionExpiresIn,
        updateAge: this.appConfigServie.sessionUpdateAge,

      },
      secret: this.appConfigServie.betterAuthSecret,
      baseURL: this.appConfigServie.baseUrl,
      basePath: '/auth',
      trustedOrigins: [ "http://localhost:5173" ],
    })

    this.logger.info(
      {
        emailPasswordEnabled: this.appConfigServie.emailPasswordEnabled,
        sessionExpiresIn: this.appConfigServie.sessionExpiresIn,
      },
      'Better Auth service initialized successfully',
    )
  }

  async verifySession(sessionToken: string) {
    if (!sessionToken) {
      this.logger.debug('No session token provided')
      return null
    }

    try {
      const [session] = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.token, sessionToken))
        .limit(1)

      if (!session) {
        this.logger.debug('Session not found in database')
        return null
      }

      const now = new Date()
      if (session.expiresAt && session.expiresAt < now) {
        this.logger.debug({ sessionId: session.id }, 'Session has expired')
        return null
      }

      const [user] = await this.db.select().from(users).where(eq(users.id, session.userId)).limit(1)

      if (!user) {
        this.logger.warn({ userId: session.userId }, 'User not found for valid session')
        return null
      }

      this.logger.debug({ userId: user.id, sessionId: session.id }, 'Session verified successfully')

      return {
        session,
        user,
      }
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Session verification failed',
      )
      return null
    }
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    try {
      await this.db
        .delete(sessions)
        .where(eq(sessions.token, sessionToken))

      this.logger.info({ sessionToken: sessionToken.substring(0, 20) + '...' }, 'Session deleted successfully')

      return true
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Session deletion failed',
      )
      return false
    }
  }
}
