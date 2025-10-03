import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { Sql } from 'postgres'
import * as schema from './schema'
import {DatabaseConfigService} from "../config/database/config.service";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private client!: Sql
  public db!: PostgresJsDatabase<typeof schema>

  constructor(private databaseConfigService: DatabaseConfigService) {}

  async onModuleInit() {
    const databaseUrl = this.databaseConfigService.url

    this.client = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })

    this.db = drizzle(this.client, { schema })
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.end()
    }
  }

  getDatabase(): PostgresJsDatabase<typeof schema> {
    return this.db
  }
}