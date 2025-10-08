import {Injectable, OnModuleInit} from '@nestjs/common'
import {AppConfigService} from "@config/app/config.service";
import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import {accounts, sessions, users, verifications} from "@database/index";
import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {DatabaseConfigService} from "@config/database/config.service";
import {eq} from "drizzle-orm";

@Injectable()
export class AuthService implements OnModuleInit {
  public auth!: ReturnType<typeof betterAuth>
  private db!: ReturnType<typeof drizzle>

  constructor(
    private readonly appConfigServie: AppConfigService,
    private readonly databaseConfigService: DatabaseConfigService
  ) {}

  onModuleInit() {
    const connection = postgres(this.databaseConfigService.url);
    this.db = drizzle(connection, { schema: { users, sessions } })

    this.auth = betterAuth({
      advanced: {
        database: {
          generateId: false
        }
      },
      database: drizzleAdapter(this.db, {
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
        enabled: this.appConfigServie.emailPasswordEnabled,
        requireEmailVerification: this.appConfigServie.emailPasswordRequireEmailVerification,
      },
      session: {
        expiresIn: this.appConfigServie.sessionExpiresIn,
        updateAge: this.appConfigServie.sessionUpdateAge,
      },
      secret: this.appConfigServie.betterAuthSecret,
      baseURL: this.appConfigServie.baseUrl,
      basePath: '/auth',
    })

  }

  async verifySession(sessionToken: string) {
    if (!sessionToken) {
      return null
    }

    try {
      // Query the database directly to verify the session
      const [session] = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.token, sessionToken))
        .limit(1)

      if (!session) {
        return null
      }

      // Check if session is expired
      const now = new Date()
      if (session.expiresAt && session.expiresAt < now) {
        return null
      }

      // Fetch the associated user
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1)

      if (!user) {
        return null
      }

      return {
        session,
        user,
      }
    } catch (error) {
      console.error('Session verification error:', error)
      return null
    }
  }
}