import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // SQLite file lives at ./prisma/dev.db; DATABASE_URL can override it.
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
