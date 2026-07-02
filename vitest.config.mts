import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the `@/*` path alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    // Unit tests cover pure lib/ modules only — no DOM needed. E2E tests live
    // in tests/e2e and are run by Playwright, not Vitest.
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // The app calendar is fixed to Asia/Seoul regardless of server timezone;
    // running the suite under a different TZ proves that independence.
    // DATABASE_URL points the shared Prisma client at a scratch database so
    // action-level tests (tests/unit/check-ins-action.test.ts) never touch
    // dev.db; the file is reset by that test's beforeAll via `prisma db push`.
    env: { TZ: "America/New_York", DATABASE_URL: "file:./prisma/unit-test.db" },
  },
});
