import { DatabaseConfigService } from '@config/database/config.service'
import { accounts } from '@database/schema/accounts.schema'
import { categories } from '@database/schema/categories.schema'
import { projects } from '@database/schema/projects.schema'
import { sessions } from '@database/schema/sessions.schema'
import { testFiles } from '@database/schema/test-files.schema'
import { tests } from '@database/schema/tests.schema'
import { users } from '@database/schema/users.schema'
import { verifications } from '@database/schema/verifications.schema'
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Sql } from 'postgres'
import postgres from 'postgres'

const schema = { accounts, categories, projects, sessions, testFiles, tests, users, verifications }

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private client!: Sql
  public drizzle!: PostgresJsDatabase<typeof schema>

  constructor(private databaseConfigService: DatabaseConfigService) {}

  onModuleInit() {
    const databaseUrl = this.databaseConfigService.url

    this.client = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })

    this.drizzle = drizzle(this.client, { schema })
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.end()
    }
  }

  getDatabase(): PostgresJsDatabase<typeof schema> {
    return this.drizzle
  }
}
