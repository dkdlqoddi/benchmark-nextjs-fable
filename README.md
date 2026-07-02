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

Dark mode: use the Light / Dark / Auto toggle in the top navigation. "Auto"
follows the OS; the choice persists in `localStorage` and applies before first
paint (no flash).

## npm scripts

| Script                  | What it does                                        |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | Start the development server on port 3000           |
| `npm run build`         | Create a production build                           |
| `npm run start`         | Serve the production build                          |
| `npm run lint`          | Run ESLint                                          |
| `npm run typecheck`     | Type-check with `tsc --noEmit`                      |
| `npm run format`        | Format the codebase with Prettier                   |
| `npm run format:check`  | Check formatting without writing                    |
| `npm run verify:streak` | Run the streak-calculation test cases               |
| `npm run db:migrate`    | Apply Prisma migrations (creates the DB if missing) |
| `npm run db:seed`       | Reset data and seed the 2 test accounts + habits    |
| `npm run db:studio`     | Open Prisma Studio to browse the database           |

## Project structure

```
app/                  # Routes (App Router)
components/ui/        # Generic UI components
components/features/  # Domain components (habit cards, nav, ...)
lib/                  # Utilities, Prisma client, Auth.js config (lib/generated/ is build output)
actions/              # Server Actions (data mutations + login/signup/logout)
prisma/               # Schema, migrations, seed script, dev.db
proxy.ts              # Route guard (Next 16's middleware): redirects signed-out users to /login
```
