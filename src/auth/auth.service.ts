import {Injectable, OnModuleInit} from '@nestjs/common'
import {AppConfigService} from "@config/app/config.service";
import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import {accounts, DatabaseService, sessions, users, verifications} from "@database/index";
import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {DatabaseConfigService} from "@config/database/config.service";

@Injectable()
export class AuthService implements OnModuleInit {
  public auth!: ReturnType<typeof betterAuth>

  constructor(private readonly appConfigServie: AppConfigService, private readonly databaseConfigService: DatabaseConfigService) {}

  onModuleInit() {
    const connection = postgres(this.databaseConfigService.url);
    const db = drizzle(connection, { schema: { users, sessions } })

    this.auth = betterAuth({
      advanced: {
        database: {
          generateId: false
        }
      },
      database: drizzleAdapter(db, {
        usePlural: true,
        provider: 'pg',
        schema: {
          users: users,
          sessions: sessions,
          accounts: accounts,
          verifications: verifications,
        }
      }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
      },
      secret: this.appConfigServie.betterAuthSecret,
      baseURL: this.appConfigServie.baseUrl,
      basePath: '/auth',
    })

  }

  async verifySession(sessionToken: string) {
    try {
      // Create a mock request object for Better Auth
      const mockRequest = {
        headers: {
          'cookie': `better-auth.session_token=${sessionToken}`
        },
        url: '/api/auth/get-session',
        method: 'GET'
      } as any

      return this.auth.api.getSession(mockRequest)
    } catch (error) {
      console.error('Session verification error:', error)
      return null
    }
  }
}