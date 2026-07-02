# HabitLog — Architecture

This document describes how HabitLog is built: the runtime model, the layers, the data model, and
the conventions that keep the codebase consistent. It is aimed at a developer (or agent) joining
the project. For setup instructions see `README.md`; for the binding project rules see `CLAUDE.md`.

## 1. System overview

HabitLog is a multi-account habit tracker: create habits, check in at most once per day per habit,
browse a monthly check-in calendar, and view streaks and weekly completion stats. It is a
server-rendered Next.js (App Router) application with a local SQLite database accessed through
Prisma. Authentication is Auth.js (NextAuth v5) with a credentials provider (email + bcrypt-hashed
password, JWT session cookie); every habit and check-in belongs to exactly one user, and every
query and mutation is scoped by the session's user id. There is no separate backend service —
pages are React Server Components that query the database directly, and every mutation (including
login/signup/logout) is a Server Action invoked from a `<form>`. Client-side JavaScript is limited
to five small islands (two form-state islands, a confirm dialog, the theme toggle, and the stats
chart).

## 2. Tech stack

| Layer      | Choice                                                           | Notes                                                                      |
| ---------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Framework  | Next.js **16.2.10** (App Router)                                 | React 19.2.4; async request APIs (`params`/`searchParams` are Promises)    |
| Language   | TypeScript (strict)                                              | `@/*` path alias maps to the repository root                               |
| Styling    | Tailwind CSS **4** (CSS-first config via `@tailwindcss/postcss`) | Class-based dark mode; design tokens as CSS variables in `app/globals.css` |
| ORM / DB   | Prisma **7.8** on SQLite (`./prisma/dev.db`)                     | `better-sqlite3` driver adapter; client generated into `lib/generated/`    |
| Auth       | Auth.js / NextAuth **v5** (credentials) + `bcryptjs`             | JWT sessions; route guard in `proxy.ts`; config split in `lib/auth*.ts`    |
| Validation | Zod **4**                                                        | Single source of truth for habit form validation (`lib/habit-schema.ts`)   |
| Charts     | Recharts **3**                                                   | Weekly completion bar chart on `/stats`                                    |
| Tooling    | npm, ESLint 9 (flat config), Prettier 3, `tsx` for scripts       | `postinstall` runs `prisma generate`                                       |

> ⚠️ Per `AGENTS.md`: this Next.js version may differ from what you remember. The bundled docs at
> `node_modules/next/dist/docs/` are the authoritative reference for framework behavior.

## 3. Request and data flow

```
READ (GET request)
  Browser ──▶ Next.js server ──▶ Server Component page (force-dynamic)
                                   │  import { prisma } from "@/lib/prisma"
                                   ▼
                              PrismaClient ──better-sqlite3 adapter──▶ prisma/dev.db
                                   │
                                   ▼
             HTML streamed to browser; the four client islands hydrate

WRITE (form submit)
  <form action={serverAction}> ──▶ Server Action in actions/
                                     │ 1. validate input (zod / date-key guards)
                                     │ 2. Prisma mutation
                                     │ 3. revalidatePath(...) for affected routes
                                     ▼
                     redirect("/") on success, or return per-field
                     error state consumed by useActionState
```

Key properties of this flow:

- **No API routes, no route handlers.** The only entry points are pages and Server Actions
  (project rule 2) — even Auth.js runs without its catch-all API route, because `signIn`/`signOut`
  are only called inside server actions. There is also no client-side data fetching — no `fetch`,
  SWR, or React Query anywhere in app code.
- **Two-layer access control.** `proxy.ts` (Next 16's renamed middleware) redirects every
  request without a session cookie to `/login` (only `/login` and `/signup` are public) — an
  optimistic, DB-free check per the framework guidance. Real authorization happens in the data
  layer: pages and actions resolve the user via `requireUserId()` / `auth()` and scope every
  Prisma query by `userId`, so a foreign habit id behaves exactly like a missing one (404 /
  no-op) even if a request gets past the proxy.
- **Progressive enhancement.** Check-in toggles, archive/restore, and delete are plain `<form>`
  posts bound to Server Actions (`action={fn.bind(null, id)}`) rendered by Server Components —
  they work before/without client JavaScript. Only the habit form, confirm dialog, theme toggle,
  and chart need hydration.
- **Revalidation, not client caches.** After each mutation the action calls `revalidatePath` for
  every route whose data changed, and the re-rendered page reflects the new database state.

## 4. Directory layout

```
app/                        # Routes (App Router). Server Components only.
  layout.tsx                #   Root layout: fonts, TopNav, theme init script, page container
  globals.css               #   Tailwind entry, design tokens, dark-mode custom variant
  page.tsx                  #   Home: active habits + today's check-in toggle
  stats/page.tsx            #   Streak tiles + weekly completion chart
  settings/page.tsx         #   Placeholder
  login/page.tsx            #   Credentials sign-in (public)
  signup/page.tsx           #   Account creation + auto sign-in (public)
  habits/new/page.tsx       #   Create form
  habits/[id]/page.tsx      #   Monthly calendar (?month=YYYY-MM)
  habits/[id]/edit/page.tsx #   Edit form
  habits/archived/page.tsx  #   Restore / permanent delete
proxy.ts                    # Route guard (Next 16's middleware): no session -> /login
actions/                    # Server Actions — the ONLY place mutations happen
  habits.ts                 #   create / update / archive / restore / delete (user-scoped)
  check-ins.ts              #   toggle today / toggle arbitrary date (user-scoped)
  auth.ts                   #   signup / login / logout (wrap Auth.js signIn/signOut)
components/
  ui/                       # Generic, domain-free UI (Card, ConfirmForm, ThemeToggle)
  features/                 # Domain components (HabitCard, HabitCalendar, HabitForm, AuthForm,
                            #   HabitStatsCard, ArchivedHabitCard, WeeklyCompletionChart, TopNav)
lib/                        # Pure utilities + integration singletons
  prisma.ts                 #   Shared PrismaClient (better-sqlite3 adapter, dev singleton)
  auth-config.ts            #   Shared Auth.js base config (JWT, callbacks; no Prisma/bcrypt)
  auth.ts                   #   Full Auth.js init (credentials provider) + requireUserId()
  auth-schema.ts            #   Zod schemas + form parsing for login/signup
  date.ts                   #   ALL date/timezone logic (Asia/Seoul day keys)
  streak.ts                 #   Pure streak math
  completion.ts             #   Pure weekly completion-rate math
  habit-schema.ts           #   Zod schema + form parsing for habit create/edit
  habit-colors.ts           #   The 8 preset habit colors (data)
  theme.ts                  #   Theme preference model + pre-paint init script
  generated/prisma/         #   Generated Prisma client (gitignored; `prisma generate`)
prisma/
  schema.prisma             # Data model (User, Habit, CheckIn)
  migrations/               # SQL migrations (applied with `npm run db:migrate`)
  seed.ts                   # Reset + seed the 2 test accounts (`npm run db:seed`)
  dev.db                    # SQLite database file (gitignored)
prisma.config.ts            # Prisma CLI config: schema/migrations paths, seed cmd, datasource URL
scripts/
  verify-streak.ts          # Executable spec for lib/streak.ts (`npm run verify:streak`)
bench-reports/              # Per-task work reports (process artifacts, not app code)
```

Naming: component files are PascalCase; everything else is kebab-case (project rule 3). Root-level
docs (`README.md`, `CLAUDE.md`, `AGENTS.md`, this file) follow ecosystem-conventional names.

## 5. Routes and rendering

| Route               | Source                          | Rendering       | Purpose                                          |
| ------------------- | ------------------------------- | --------------- | ------------------------------------------------ |
| `/`                 | `app/page.tsx`                  | `force-dynamic` | Active habits with today's check-in state        |
| `/stats`            | `app/stats/page.tsx`            | `force-dynamic` | Weekly completion chart + per-habit streak tiles |
| `/habits/new`       | `app/habits/new/page.tsx`       | static          | Create-habit form (no data reads)                |
| `/habits/[id]`      | `app/habits/[id]/page.tsx`      | `force-dynamic` | Monthly calendar; month via `?month=YYYY-MM`     |
| `/habits/[id]/edit` | `app/habits/[id]/edit/page.tsx` | `force-dynamic` | Edit form pre-filled from the database           |
| `/habits/archived`  | `app/habits/archived/page.tsx`  | `force-dynamic` | Archived list with restore / delete              |
| `/settings`         | `app/settings/page.tsx`         | static          | Placeholder                                      |
| `/login`            | `app/login/page.tsx`            | static          | Credentials sign-in (public)                     |
| `/signup`           | `app/signup/page.tsx`           | static          | Account creation, signs straight in (public)     |

All routes except `/login` and `/signup` require a session (enforced by `proxy.ts`, re-checked by
`requireUserId()` in every data-reading page); signed-in users are bounced off the auth pages back
to `/`. "Static" is nominal — the session-aware `TopNav` in the root layout reads cookies, so in
practice every route renders dynamically.

Rendering/caching strategy: **Cache Components is not enabled** (`next.config.ts` is empty), so
this app uses the classic model in which routes are statically prerendered unless made dynamic.
Every page that reads the database therefore exports `const dynamic = "force-dynamic"` with a
one-line comment — habit data changes at runtime, and a stale prerender would be wrong. If the
project ever adopts `cacheComponents: true`, those exports are the inventory of pages to revisit.

Next 16 specifics used here: `params` and `searchParams` are Promises and are awaited;
`generateMetadata` derives the habit detail page title; the root layout defines a
`%s — HabitLog` title template.

## 6. Data layer

**Prisma 7 wiring** (differs from Prisma 5/6 setups):

- CLI configuration lives in `prisma.config.ts` — schema path, migrations path, seed command
  (`tsx prisma/seed.ts`), and the datasource URL, which defaults to `file:./prisma/dev.db` with an
  optional `DATABASE_URL` override. No `.env` file is required.
- The client is generated by the `prisma-client` generator into `lib/generated/prisma`
  (gitignored, ESLint-ignored; regenerated by the `postinstall` script).
- At runtime the client is constructed with the `@prisma/adapter-better-sqlite3` driver adapter in
  `lib/prisma.ts`, which caches the instance on `globalThis` in development so hot reloads reuse
  one connection. **Always import the shared `prisma` from `@/lib/prisma`** — never construct a
  client elsewhere (the only exception is `prisma/seed.ts`, a standalone CLI script).

**Data model** (`prisma/schema.prisma`):

```
User     id (cuid) · email (unique, lowercase) · passwordHash (bcrypt) · createdAt · habits[]
Habit    id (cuid) · userId (FK → User, onDelete: Cascade, indexed) · name · description? ·
         color (hex string) · createdAt · archivedAt? · checkIns[]
CheckIn  id (cuid) · habitId (FK → Habit, onDelete: Cascade) · date (string "YYYY-MM-DD") · createdAt
         @@unique([habitId, date])
```

Deliberate modeling choices:

- **Ownership is one FK deep.** `CheckIn` has no `userId` of its own — it belongs to whoever owns
  its habit, so check-in scoping always goes through the habit (`habit: { userId }` relation
  filters, or an ownership `findFirst` before touching check-ins). One source of truth, no
  possibility of a check-in whose owner disagrees with its habit's owner.
- **`CheckIn.date` is a `YYYY-MM-DD` string, not a `DateTime`.** A check-in belongs to a calendar
  day in the app timezone; storing the day key makes day identity timezone-proof and makes
  lexicographic comparison equal to chronological comparison (used by range queries and the pure
  math in `lib/streak.ts` / `lib/completion.ts`).
- **At most one check-in per habit per day** is enforced by the `@@unique([habitId, date])`
  constraint; the toggle action treats a concurrent unique violation (`P2002`) as "target state
  already reached" rather than an error.
- **Archiving is a soft flag** (`archivedAt` timestamp). Home and stats filter on
  `archivedAt: null`; the archive page lists the rest. Permanent deletion happens only from the
  archive, behind a confirm dialog.
- **Deletion does not rely on the FK cascade.** `deleteHabit` explicitly deletes check-ins and the
  habit in one `$transaction`, because SQLite only honors `ON DELETE CASCADE` when
  `PRAGMA foreign_keys` is on, which is driver-dependent.
- **String length limits live in the validation layer** (name ≤ 50, description ≤ 200 in
  `lib/habit-schema.ts`), since SQLite has no length-limited string types.

## 7. Domain logic — pure functions in `lib/`

All non-trivial logic is kept in pure, framework-free modules so it can be reasoned about and
verified in isolation:

- `lib/date.ts` — the **only** place calendar dates are computed. The app's calendar is fixed to
  `Asia/Seoul` (`APP_TIME_ZONE`) regardless of server TZ, implemented with an `Intl.DateTimeFormat`
  (`en-CA` → `YYYY-MM-DD`). Provides `todayKey`, `dateKey`, `addDays`, `startOfWeek` (Sunday, to
  match the calendar UI), `isFutureKey`, month arithmetic (`parseMonth`, `addMonths`,
  `monthParam`, `monthLabel`), and label formatters. Never compute "today" or a date key ad hoc.
- `lib/streak.ts` — `currentStreak` (run ending today, or yesterday when today is unchecked),
  `longestStreak`, `computeStreaks`. Pure: `today` is a parameter, which is what makes
  `scripts/verify-streak.ts` deterministic.
- `lib/completion.ts` — `weeklyCompletionRates` for the last N Sunday-start weeks;
  `possible = habits × elapsed days`, so the current week is capped at days elapsed so far.
- `lib/habit-schema.ts` — the zod schema for the habit form plus `parseHabitForm`, which maps zod
  issues to one message per field and echoes the submitted values back (the
  `useActionState`-compatible `HabitFormState` shape).
- `lib/habit-colors.ts` — the 8 preset colors as data, with the `isHabitColor` guard the schema
  uses.
- `lib/auth-schema.ts` — zod schemas for login (non-empty password) and signup (8–72 chars —
  bcrypt only reads 72 bytes) plus `parseAuthForm`; emails are trimmed + lowercased, and the
  password is never echoed back in form state.
- `lib/theme.ts` — theme preference model (see §9).

Pages are thin: they fetch rows with Prisma, call these pure functions, and render.

## 8. Components and mutations

**Server Components by default** (project rule 1). Exactly five components are client components,
each opening with a one-line comment justifying why:

| Component                                       | Why it must be client                                               |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `components/features/HabitForm.tsx`             | `useActionState` for per-field server errors + pending state        |
| `components/features/AuthForm.tsx`              | Same — shared login/signup form                                     |
| `components/ui/ConfirmForm.tsx`                 | Intercepts submit with `window.confirm` before a destructive action |
| `components/ui/ThemeToggle.tsx`                 | Reads/writes `localStorage`, `matchMedia`, `useSyncExternalStore`   |
| `components/features/WeeklyCompletionChart.tsx` | Recharts measures the DOM and drives the hover tooltip              |

`components/ui/` holds generic building blocks; `components/features/` holds domain components
(project rule 4). Server Components freely render `<form action={serverAction.bind(null, id)}>`,
which is how the check-in toggle buttons and calendar day cells mutate without being client
components.

**Server Actions** (project rule 2 — all mutations, no API routes). Every data action begins with
`requireUserId()` and scopes its queries by that id:

| Action                 | File                   | Behavior                                                                         | Revalidates             |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------------- | ----------------------- |
| `createHabit`          | `actions/habits.ts`    | Zod-validate → create with `userId` → redirect `/`; field errors on failure      | `/`                     |
| `updateHabit`          | `actions/habits.ts`    | Zod-validate → scoped ownership check → update → redirect `/`                    | `/`                     |
| `archiveHabit`         | `actions/habits.ts`    | Scoped `updateMany` sets `archivedAt` (foreign id = no-op)                       | `/`, `/habits/archived` |
| `restoreHabit`         | `actions/habits.ts`    | Scoped `updateMany` clears `archivedAt` (foreign id = no-op)                     | `/`, `/habits/archived` |
| `deleteHabit`          | `actions/habits.ts`    | `$transaction`: scoped delete of check-ins, then habit                           | `/habits/archived`      |
| `toggleTodayCheckIn`   | `actions/check-ins.ts` | Scoped ownership gate, then toggle (delete-then-create)                          | `/`, `/habits/[id]`     |
| `toggleCheckInForDate` | `actions/check-ins.ts` | Same, for one calendar date; rejects malformed keys and future dates server-side | `/`, `/habits/[id]`     |
| `signup`               | `actions/auth.ts`      | Zod-validate → bcrypt-hash → create user (P2002 = "email taken") → sign in       | —                       |
| `login`                | `actions/auth.ts`      | `signIn("credentials")`; `AuthError` becomes a form error, success redirects `/` | —                       |
| `logout`               | `actions/auth.ts`      | `signOut()`, redirects to `/login` (form button in `TopNav`)                     | —                       |

Validation is intentionally **server-only**: the habit and auth forms omit native validation
attributes (`noValidate`) so the zod schemas stay the single source of truth, and the calendar's
disabled future cells are mirrored by the server-side future-date guard (never trust the UI state
alone).

**Authentication mechanics.** The Auth.js config is split in two: `lib/auth-config.ts` is the
DB-free base (JWT strategy, `/login` page, callbacks that put the user id into the token and onto
`session.user.id`) used by `proxy.ts`, and `lib/auth.ts` layers on the credentials provider —
zod-parse the credentials, look up the user by email, `bcrypt.compare` against `passwordHash`
(comparing against a constant dummy hash when the email is unknown, so both failure paths cost
the same). `authorize` returning `null` rejects the login. Sessions are stateless JWT cookies
(`authjs.session-token`); `AUTH_SECRET` has a dev fallback so the zero-`.env` setup keeps working.
Passwords are hashed with bcrypt (cost 10) at signup and in the seed script.

## 9. Styling and theming

- **Tailwind 4, CSS-first.** `app/globals.css` starts with `@import "tailwindcss"`; there is no
  `tailwind.config` file. Design tokens are CSS variables (`--background`, `--foreground`, chart
  tokens `--chart-accent` / `--chart-grid` / `--chart-muted-text`) mapped into Tailwind via
  `@theme inline`, with dark values overridden in a `.dark { … }` block.
- **Dark mode is class-based and user-controlled.** `@custom-variant dark` keys every `dark:`
  utility off the `.dark` class on `<html>`. The flow: `THEME_INIT_SCRIPT` (from `lib/theme.ts`)
  is inlined as the first child of `<body>` in the root layout and applies the stored preference
  before first paint (no flash — this is why `<html>` has `suppressHydrationWarning`). The
  `ThemeToggle` (Light / Dark / Auto) persists the choice under the `theme` localStorage key,
  toggles the class, syncs across tabs via the `storage` event, and — in Auto — tracks OS changes
  live through a `matchMedia` listener. **Do not add `prefers-color-scheme` media queries to
  stylesheets**; the media query exists only in JS to resolve the "system" preference. Dark styles
  go through `dark:` classes or the `.dark` CSS block.
- **No hardcoded colors in components** (project rule 5): Tailwind tokens only (zinc neutrals, red
  for destructive). The one documented exception is data-driven habit colors — `habit.color`
  values and the `HABIT_COLORS` swatches — applied via inline `style`, because they are user data,
  not stylesheet values. The chart reads its colors from the CSS variables so it adapts to both
  themes.
- **Fonts**: Geist Sans / Geist Mono via `next/font`, exposed as CSS variables on `<html>`.
- **Accessibility**: toggles carry `aria-pressed`, calendar cells have per-date `aria-label`s, and
  the chart is mirrored by an `sr-only` data table.

## 10. Developer workflow

```bash
npm install          # postinstall generates the Prisma client into lib/generated/
npm run db:migrate   # create/upgrade prisma/dev.db
npm run db:seed      # reset data; 2 test accounts (alice@test.com / bob@test.com, password123)
npm run dev          # http://localhost:3000 — log in as a seeded account or sign up
```

Quality gates (all must pass; there is no unit-test framework):

- `npm run typecheck` — `tsc --noEmit`, strict mode.
- `npm run lint` — ESLint 9 flat config (`eslint-config-next` core-web-vitals + TypeScript,
  Prettier-conflicting rules off, `lib/generated/` ignored).
- `npm run format:check` — Prettier (printWidth 100; `bench-reports/` and generated files ignored).
- `npm run verify:streak` — executable spec for the streak math (fixed `today`, spec + edge cases,
  non-zero exit on failure).

Other conventions: every exported function carries at least one line of JSDoc (project rule 6);
`package.json#allowScripts` allowlists the packages permitted to run install scripts (Prisma
engines, better-sqlite3, esbuild, sharp); `bench-reports/pNN.md` records each task's work and is
kept verbatim (Prettier-ignored).

## 11. Invariants checklist

The short list to keep in mind when changing anything:

1. Dates are `YYYY-MM-DD` strings in Asia/Seoul, produced only by `lib/date.ts` helpers.
2. Database access goes through `@/lib/prisma`; mutations live only in `actions/`.
3. **Every habit/check-in query and mutation is scoped by the session user id** (via
   `requireUserId()` / `auth()`): pages use `findFirst({ where: { id, userId } })` → `notFound()`,
   actions use scoped `updateMany`/`deleteMany` or an ownership gate. Never trust the proxy alone,
   and never query a habit by bare id.
4. The proxy stays DB-free (optimistic cookie check only); `proxy.ts` imports `lib/auth-config.ts`,
   never `lib/auth.ts`.
5. Any page that reads the database exports `dynamic = "force-dynamic"` and actions
   `revalidatePath` every route they affect.
6. Server Components by default; a new `'use client'` needs a genuine browser capability and a
   justifying comment.
7. Zod (`lib/habit-schema.ts`, `lib/auth-schema.ts`) is the only validation authority for user
   input; server actions re-validate everything the UI already constrains.
8. Colors come from Tailwind tokens or the chart CSS variables — inline styles only for
   `habit.color` data.
9. Dark mode = `.dark` class on `<html>`; never `prefers-color-scheme` in CSS.
10. Passwords: bcrypt-hashed only (`passwordHash`), never logged, never echoed back into form
    state.
