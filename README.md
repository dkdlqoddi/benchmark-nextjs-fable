# HabitLog

A simple habit tracker: create habits, check in daily, and watch your streaks grow.

Built with **Next.js 16** (App Router, `proxy.ts` route guard), **TypeScript**
(strict), **Tailwind CSS v4**, **Prisma 7** on SQLite (better-sqlite3 driver
adapter), **Auth.js v5** (credentials), **zod** validation, and a **Vitest +
Playwright** test suite.

## Features

- **Accounts** — email + password signup/login/logout (Auth.js credentials,
  JWT session cookie, bcrypt hashing). Every page except `/login` and
  `/signup` requires a session; all data is private to the account that owns
  it (a foreign habit id 404s exactly like a missing one). Repeated failed
  logins are throttled: 5 consecutive failures lock the email for 15 minutes
  (in-memory, per process — `lib/login-rate-limit.ts`).
- **Habits** — create and edit with a name, optional description, one of 8
  preset colors, and **target days of the week** (e.g. Mon/Wed/Fri; default
  every day). Archive habits to pause them, restore them later, or delete
  them permanently (confirmation required; removes their check-ins).
- **Daily check-ins** — one per habit per day, enforced by a unique index.
  Toggle today from the home card, or click any past day in the habit's
  monthly calendar to back-fill (future days are disabled). The calendar day
  is fixed to **Asia/Seoul** regardless of the server timezone
  (`lib/date.ts`), and each button binds the date it was rendered for, so a
  click just after midnight still toggles the day you saw.
- **Streaks & stats** — current and longest streak per habit (counting target
  days only; off-day check-ins are allowed but don't extend or break a
  streak), total check-ins, and a weekly completion chart for the last 8
  weeks — server-rendered HTML/CSS (no chart library), with hover/keyboard
  tooltips and an sr-only data table.
- **Tags & search** — up to 5 tags per habit (comma-separated, normalized to
  lowercase, private per account). The home page filters by tag chips
  (`?tag=`) and free-text search (`?q=`, matching name, description, and tag
  names, case-insensitive); the two filters compose.
- **Dark mode** — Light / Dark / Auto toggle in the top nav. "Auto" follows
  the OS; the choice persists in `localStorage` and applies before first
  paint (no flash).
- **Production niceties** — custom 404 page, route-level and global error
  boundaries with retry, loading skeletons on the stats and archive pages,
  and per-page metadata (title + description).

## Prerequisites

- Node.js 20.9+ (any recent LTS works)
- npm

## Setup & run

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

Open <http://localhost:3000> and log in with one of the seeded accounts (or
sign up):

| Email            | Password      |
| ---------------- | ------------- |
| `alice@test.com` | `password123` |
| `bob@test.com`   | `password123` |

For a production build: `npm run build && npm run start`.

### Configuration

No `.env` file is needed for local development:

- **`DATABASE_URL`** — SQLite connection, defaults to `file:./prisma/dev.db`.
- **`AUTH_SECRET`** — signs/encrypts the JWT session cookie. A built-in
  **dev-only** fallback is used when unset. **In production there is no
  fallback:** set a real secret (e.g. `openssl rand -base64 32`), or every
  request fails with Auth.js's `MissingSecret` error rather than running on a
  forgeable secret.

## Testing

```bash
npm test              # Vitest unit tests (tests/unit/)
npm run test:e2e      # Playwright E2E tests (tests/e2e/)
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run format:check  # Prettier check
```

- **Unit tests** (110 across 6 files) cover the streak/completion/date math —
  including Asia/Seoul midnight-boundary regressions — the zod form schemas,
  the login rate limiter, and action-level check-in tests that run the real
  Prisma client against a scratch database (`prisma/unit-test.db`, reset
  automatically). The suite runs under `TZ=America/New_York` to prove the
  app's calendar is independent of the server timezone.
- **E2E tests** build and serve a **production** build on port 3100 with its
  own database (`prisma/test.db`, reset per run), so your dev server and data
  are untouched. They cover the full journey (signup → login → create →
  check in → stats), cross-user isolation (foreign habit ids 404), the
  signed-out redirect, and the login-throttle lockout. If Chromium isn't
  installed yet, run `npx playwright install chromium` once first.

## npm scripts

| Script                    | What it does                                        |
| ------------------------- | --------------------------------------------------- |
| `npm run dev`             | Start the development server on port 3000           |
| `npm run build`           | Create a production build                           |
| `npm run start`           | Serve the production build                          |
| `npm run lint`            | Run ESLint                                          |
| `npm run typecheck`       | Type-check with `tsc --noEmit`                      |
| `npm run format`          | Format the codebase with Prettier                   |
| `npm run format:check`    | Check formatting without writing                    |
| `npm test`                | Run the Vitest unit tests (`tests/unit/`)           |
| `npm run test:e2e`        | Run the Playwright E2E tests (`tests/e2e/`)         |
| `npm run test:e2e:server` | Reset test DB + build + serve (used by Playwright)  |
| `npm run db:migrate`      | Apply Prisma migrations (creates the DB if missing) |
| `npm run db:seed`         | Reset data and seed the 2 test accounts + habits    |
| `npm run db:studio`       | Open Prisma Studio to browse the database           |

## Project structure

```
app/                    # Routes (App Router)
  page.tsx              #   Home: habit cards, today's check-in, tag/search filters
  habits/new/           #   Create-habit form
  habits/[id]/          #   Habit detail (monthly check-in calendar) + edit form
  habits/archived/      #   Archived habits (restore / permanent delete)
  stats/                #   Streaks + weekly completion chart
  settings/             #   Placeholder
  login/, signup/       #   Auth pages (the only public routes)
  layout.tsx            #   Root layout: fonts, top nav, theme init
  error.tsx             #   Route-level error boundary (global-error.tsx for the layout itself)
  not-found.tsx         #   Custom 404 (unmatched URLs and foreign/missing habit ids)
  */loading.tsx         #   Loading skeletons (stats, archived)
components/ui/          # Generic UI (Card, ConfirmForm, Skeleton, ThemeToggle)
components/features/    # Domain components (habit cards, forms, calendar, chart, nav)
lib/                    # Utilities: date/streak/completion math, tags, target days,
                        #   zod schemas, Auth.js config, login rate limiter, Prisma
                        #   client (lib/generated/ is build output, gitignored)
actions/                # Server Actions — every mutation: habits, check-ins, auth
prisma/                 # Schema, migrations, seed script, dev.db (gitignored)
tests/unit/             # Vitest unit tests
tests/e2e/              # Playwright E2E tests (own DB at prisma/test.db, port 3100)
proxy.ts                # Route guard (Next 16's middleware): redirects signed-out
                        #   users to /login; real authorization lives in the data layer
AUDIT.md                # Security & quality audit (p18): findings and their status
bench-reports/          # Per-task work reports
```

### Conventions

- Server Components by default; `'use client'` only where interactivity
  requires it (each such file says why at the top).
- All mutations go through Server Actions — there are no API routes.
- Every query is scoped by the session user id; ownership checks live in
  `lib/ownership.ts`.
- No hardcoded colors outside Tailwind tokens, except the data-driven habit
  colors (`lib/habit-colors.ts`) applied via inline styles.
