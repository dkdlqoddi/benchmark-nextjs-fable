import { defineConfig, devices } from "@playwright/test";

// The E2E suite never touches the dev database: the web server is built and
// started against a dedicated SQLite file (prisma/test.db, reset per run) on
// its own port, so `npm run dev` on :3000 and its data stay untouched.
const PORT = 3100;
const DATABASE_URL = "file:./prisma/test.db";

export default defineConfig({
  testDir: "tests/e2e",
  // Single worker: the app writes to one SQLite file; serial tests keep the
  // suite deterministic. Tests isolate their state via unique per-run emails.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Retries start over with fresh accounts (emails are unique per attempt);
  // one local retry absorbs rare clock-boundary flakes, CI gets two.
  retries: process.env.CI ? 2 : 1,
  reporter: "list",
  use: {
    // Chromium runs headless by default — nothing extra needed for CI.
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Resets the test database, applies the schema, then serves a production
    // build (the framework-recommended target for E2E).
    command: "npm run test:e2e:server",
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // AUTH_SECRET: the E2E server is a production build, and production
    // deliberately has no built-in secret fallback (see lib/auth-config.ts) —
    // a throwaway test-only value stands in for a real deployment secret.
    env: { DATABASE_URL, PORT: String(PORT), AUTH_SECRET: "habitlog-e2e-test-secret" },
  },
});
