import { DatabaseConfigService } from '@config/database/config.service'
import * as schema from '@database/schema'
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Sql } from 'postgres'
import postgres from 'postgres'

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
