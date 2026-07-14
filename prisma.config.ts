import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moves the CLI/Migrate connection URL out of schema.prisma into here.
// The runtime client uses a driver adapter (see src/lib/prisma.ts).
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
