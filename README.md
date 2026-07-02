# HabitLog

A simple habit tracker: create habits, check in daily, and watch your streaks grow.

Built with Next.js (App Router), TypeScript (strict), Tailwind CSS, and Prisma on SQLite.

## Prerequisites

- Node.js 20.9+ (any recent LTS works)
- npm

## Setup

```bash
# 1. Install dependencies (postinstall generates the Prisma client)
npm install

# 2. Create the SQLite database at ./prisma/dev.db and apply migrations
npm run db:migrate

# 3. Seed 3 sample habits with two weeks of random check-ins
npm run db:seed

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000> — the home page lists the seeded habits.

The database connection defaults to `file:./prisma/dev.db`; set the `DATABASE_URL`
environment variable to override it.

Check-in dates ("today", the calendar) are fixed to the **Asia/Seoul** timezone
regardless of the server's TZ — see the helpers in `lib/date.ts`.

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
| `npm run db:migrate`   | Apply Prisma migrations (creates the DB if missing) |
| `npm run db:seed`      | Reset data and seed sample habits + check-ins       |
| `npm run db:studio`    | Open Prisma Studio to browse the database           |

## Project structure

```
app/                  # Routes (App Router)
components/ui/        # Generic UI components
components/features/  # Domain components (habit cards, nav, ...)
lib/                  # Utilities, Prisma client (lib/generated/ is build output)
actions/              # Server Actions (data mutations)
prisma/               # Schema, migrations, seed script, dev.db
```
