# HabitLog

A simple habit tracker: create habits, check in daily, and watch your streaks grow.

Built with Next.js (App Router), TypeScript (strict), Tailwind CSS, Prisma on SQLite,
and Auth.js (NextAuth v5) credentials authentication.

## Prerequisites

- Node.js 20.9+ (any recent LTS works)
- npm

## Setup

```bash
# 1. Install dependencies (postinstall generates the Prisma client)
npm install

# 2. Create the SQLite database at ./prisma/dev.db and apply migrations
npm run db:migrate

# 3. Seed 2 test accounts, each with 3 habits and two weeks of random check-ins
npm run db:seed

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000> and log in with one of the seeded accounts (or sign up):

| Email            | Password      |
| ---------------- | ------------- |
| `alice@test.com` | `password123` |
| `bob@test.com`   | `password123` |

Every page except `/login` and `/signup` requires a session, and all habit data is
private to the account that owns it.

The database connection defaults to `file:./prisma/dev.db`; set the `DATABASE_URL`
environment variable to override it. Sessions are JWT cookies signed with
`AUTH_SECRET` — a built-in dev fallback is used when unset, so no `.env` is needed
for local development (set a real `AUTH_SECRET` in any deployment).

Check-in dates ("today", the calendar) are fixed to the **Asia/Seoul** timezone
regardless of the server's TZ — see the helpers in `lib/date.ts`.

Each habit has **target days of the week** (e.g. Mon/Wed/Fri; default: every day).
Off-day check-ins are allowed — the check-in UI is just dimmed — but streaks count
target days only (`lib/target-days.ts`, `lib/streak.ts`).

Habits can carry up to 5 **tags** (comma-separated in the habit form, normalized to
lowercase, private per account). The home page filters by tag via chips / `?tag=`,
and a **search box** (`?q=`) matches name, description, and tag names
(case-insensitive); both filters compose.

Dark mode: use the Light / Dark / Auto toggle in the top navigation. "Auto"
follows the OS; the choice persists in `localStorage` and applies before first
paint (no flash).

## npm scripts

| Script                 | What it does                                        |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Start the development server on port 3000           |
| `npm run build`        | Create a production build                           |
| `npm run start`        | Serve the production build                          |
| `npm run lint`         | Run ESLint                                          |
| `npm run typecheck`    | Type-check with `tsc --noEmit`                      |
| `npm run format`       | Format the codebase with Prettier                   |
| `npm run format:check` | Check formatting without writing                    |
| `npm test`             | Run the Vitest unit tests (`tests/unit/`)           |
| `npm run test:e2e`     | Run the Playwright E2E tests (`tests/e2e/`)         |
| `npm run db:migrate`   | Apply Prisma migrations (creates the DB if missing) |
| `npm run db:seed`      | Reset data and seed the 2 test accounts + habits    |
| `npm run db:studio`    | Open Prisma Studio to browse the database           |

## Project structure

```
app/                  # Routes (App Router)
components/ui/        # Generic UI components
components/features/  # Domain components (habit cards, nav, ...)
lib/                  # Utilities, Prisma client, Auth.js config (lib/generated/ is build output)
actions/              # Server Actions (data mutations + login/signup/logout)
prisma/               # Schema, migrations, seed script, dev.db
tests/unit/           # Vitest unit tests (streak/date math, zod schemas)
tests/e2e/            # Playwright E2E tests (own database at prisma/test.db)
proxy.ts              # Route guard (Next 16's middleware): redirects signed-out users to /login
```
