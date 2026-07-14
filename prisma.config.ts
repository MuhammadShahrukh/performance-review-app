import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 moves the CLI/Migrate connection URL out of schema.prisma into here.
// The runtime client uses a driver adapter (see src/lib/prisma.ts).
//
// CLI operations (db push / migrate) need a DIRECT connection — Neon's pooled
// (PgBouncer) endpoint can reject DDL. Prefer the unpooled URL when present and
// fall back to DATABASE_URL for local/dev.
const directUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  "";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: directUrl,
  },
});
