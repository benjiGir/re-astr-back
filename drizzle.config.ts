
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/database/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/re_astr',
  },
} satisfies Config