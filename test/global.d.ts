import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  var __TESTCONTAINERS_POSTGRES_URI__: string | undefined;
  var __TESTCONTAINERS_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export {};