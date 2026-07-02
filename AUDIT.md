# HabitLog — Security & Quality Audit (p18)

Audit of the full codebase as of commit `e996e8d`, covering the four requested
areas: **security**, **data integrity**, **performance**, and **accessibility**.
Every `app/`, `actions/`, `components/`, `lib/`, `prisma/`, and `tests/` file was
read; runtime claims were verified empirically where noted (e.g. the SQLite
foreign-key pragma was probed through the real driver adapter).

**Severity scale**

| Severity | Meaning                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| Critical | Exploitable now, in the default configuration, with major impact (cross-user data access, RCE, data loss). |
| High     | Real security/integrity hole, but conditional on a plausible misconfiguration or sustained attack.         |
| Medium   | Defect with limited blast radius (self-inflicted data pollution, 500s under races, WCAG AA failures).      |
| Low      | Hardening opportunities, rule violations with cosmetic impact, nits.                                       |

**Result: 0 Critical · 2 High (both fixed) · 7 Medium (3 fixed) · 11 Low (1 fixed).**

---

## Critical

None found. Specifically checked and ruled out:

- **Cross-user access (IDOR):** every habit/check-in mutation gates on
  `findOwnedHabit(userId, habitId)` (`lib/ownership.ts`), archive/restore use
  `updateMany` scoped by `userId`, and the detail/edit/metadata queries all
  filter by `userId` — a foreign habit id behaves exactly like a missing one
  (confirmed by the `tests/e2e/user-isolation.spec.ts` E2E test).
- **Auth bypass around the proxy:** the route guard (`proxy.ts`) is only
  optimistic; real authorization is re-checked in the data layer via
  `requireUserId()` on every page and action that touches data.
- **Injection:** all queries go through Prisma (parameterized); no raw SQL in
  app code; React escapes all user data; the only `dangerouslySetInnerHTML` is
  the constant theme-init script with no user input.
- **Secrets/data in git:** `dev.db`, `.env*`, and the generated client are
  gitignored and untracked (verified with `git ls-files`).

## High

### S-1 · Production silently runs on a committed, publicly-known AUTH_SECRET — **FIXED**

- **Where:** `lib/auth-config.ts:13`
- **Issue:** `process.env.AUTH_SECRET ?? "habitlog-dev-only-secret-change-in-production"`.
  The fallback keeps zero-`.env` dev working, but it also applies with
  `NODE_ENV=production`: any deployment that forgets `AUTH_SECRET` signs and
  encrypts its session JWTs with a string that is committed to this repository.
  Whoever reads the repo can then forge a session cookie for **any user id**
  (full authentication bypass / account takeover) or decrypt captured cookies.
  It also defeats Auth.js's own fail-safe: `@auth/core` refuses to serve
  requests without a secret (`MissingSecret`), but here a secret is always
  supplied.
- **Fix applied:** the fallback is now used **only outside production**
  (`NODE_ENV !== "production"`). In production the secret comes exclusively
  from the environment; when it is missing, Auth.js fails closed per request
  with `MissingSecret` (verified in `@auth/core/lib/utils/assert.js`) instead
  of running insecurely. The Playwright web server (a production build) now
  sets an explicit throwaway `AUTH_SECRET`, and the README documents the
  requirement.

### S-2 · No brute-force protection on the credentials login — **FIXED**

- **Where:** `actions/auth.ts` (`login`), `lib/auth.ts` (`authorize`)
- **Issue:** the login server action (server actions are ordinary POST
  endpoints — Next's own docs say to treat them as directly reachable) accepts
  unlimited password guesses per email at full speed. There is no lockout,
  backoff, or rate limit, so online credential-stuffing/brute-force against a
  known email is only bounded by bcrypt speed. (Positive: unknown emails
  already cost one bcrypt compare against a dummy hash, so there is no timing
  oracle for account existence.)
- **Fix applied:** `lib/login-rate-limit.ts` — an in-memory, per-email
  consecutive-failure lockout wired into the `login` action: 5 consecutive
  failures lock the (normalized) email for 15 minutes; any successful login
  clears the counter; the lockout message is generic (it never discloses
  whether the account exists, and applies to unknown emails too). Covered by
  unit tests (`tests/unit/login-rate-limit.test.ts`). **Documented
  limitation:** the store is per-process (fits this single-node SQLite app);
  a multi-instance deployment needs a shared store (e.g. Redis) — and a
  distributed attacker with many IPs can still spread guesses across emails;
  per-IP throttling belongs in the reverse proxy in front of the app.

## Medium

### D-1 · Check-in action accepts calendar-invalid date keys — **FIXED**

- **Where:** `actions/check-ins.ts:9` (`DATE_KEY_PATTERN`)
- **Issue:** the server-side guard checked only the _shape_ (`\d{4}-\d{2}-\d{2}`)
  and the future bound. A key like `"2026-02-31"` or `"2025-13-40"` passes both
  (string comparison against today) and is stored as a real `CheckIn` row.
  The date arrives as a **`.bind()` argument, which is serialized to the client
  and can be tampered with** (Next encrypts closures, not bound args; actions
  are directly POSTable). Impact is self-inflicted only — but the junk row is
  permanent (no calendar cell ever maps to it, so the UI cannot untoggle it)
  and inflates the "Total check-ins" stat.
- **Fix applied:** new `isValidDateKey()` in `lib/date.ts` (format **and**
  real calendar day: month 1–12, day within `daysInMonth`, leap-aware) used by
  `toggleCheckInForDate`; unit tests added at both the date-helper and the
  action level.

### D-2 · `updateHabit` returns a 500 when the habit vanishes mid-request — **FIXED**

- **Where:** `actions/habits.ts:65` (`prisma.habit.update`)
- **Issue:** TOCTOU between the `findOwnedHabit` ownership gate and the
  unscoped `update({ where: { id } })`: if the habit is deleted concurrently
  (e.g. from the archive page in another tab), the update throws `P2025`,
  which was unhandled → generic 500 error page. Not a security hole (ownership
  cannot change, so the gate stays valid), but `deleteHabit` already handles
  exactly this race while `updateHabit` did not.
- **Fix applied:** `P2025` is caught and mapped to the same
  "This habit no longer exists." form error the gate produces.

### D-3 · Toggle semantics + no pending-disable → double-submit undoes itself — Open (documented)

- **Where:** `components/features/HabitCard.tsx:67`, `components/features/HabitCalendar.tsx:82`, `actions/check-ins.ts`
- **Issue:** the check-in forms submit a _toggle_. Two rapid clicks (or a
  retried request) net out to "no change", silently losing the user's intent.
  Note the classic **duplicate check-in race is already handled correctly**:
  `@@unique([habitId, date])` makes duplicate rows impossible and the action
  treats the `P2002` unique violation as success; concurrent delete+create
  pairs settle into a consistent state. What remains is intent-level, not
  corruption.
- **Recommendation:** bind the _desired state_ (`setCheckIn(habitId, date,
checked)`) so replays are idempotent, and/or disable the submit while
  pending (requires a small client component / `useFormStatus`). Left open:
  it changes a heavily-tested action's API and the UI's semantics — worth its
  own reviewed change.

### D-4 · `updateHabit` tag replacement + orphan-tag cleanup are not atomic — Open (documented)

- **Where:** `actions/habits.ts:65–73`
- **Issue:** the tag `set/connectOrCreate` update and the subsequent
  `deleteOrphanTags` run as two separate operations (unlike `deleteHabit`,
  which wraps its steps in `$transaction`). A crash between them leaves
  orphaned tags (invisible in the UI — the chips query filters them out — but
  they occupy the per-user unique name until reused), and a concurrent edit of
  two habits sharing a tag can, in a narrow window, fail one request's
  `connectOrCreate` with a foreign-key error. SQLite's single-writer model
  makes this hard to hit in practice.
- **Recommendation:** wrap the update + cleanup in one `$transaction` (the
  same shape `deleteHabit` already uses).

### A-1 · Color contrast below WCAG AA — **PARTIALLY FIXED**

- **(a) Metadata labels — FIXED.** `text-zinc-400` on white ≈ **2.6:1** (light)
  and `dark:text-zinc-500` on the zinc-900 card ≈ **3.7:1** — both under the
  4.5:1 AA minimum for small text. Used for the target-days line on
  `HabitCard`/`HabitStatsCard`/habit detail and the "Archived …" line.
  Swapped to `text-zinc-500 dark:text-zinc-400` (≈ 4.7:1 light, ≈ 6.9:1 dark),
  matching the secondary-text convention already used elsewhere.
- **(b) White text on habit colors — Open.** The checked "✓ Done today" button
  and checked calendar cells render white text on the habit color. **All 8
  preset colors fail AA** for 14px text: amber ≈ 2.1:1, orange ≈ 2.8:1,
  sky ≈ 2.8:1, emerald ≈ 2.5:1, pink ≈ 3.5:1, blue ≈ 3.7:1, red ≈ 3.8:1,
  violet ≈ 4.2:1. Needs a design decision: per-color ink (dark text on light
  colors), darker 600/700-scale fills, or a check-glyph + neutral label
  treatment. Left open rather than half-designed here.
- **(c) Dimmed off-day calendar text — Open.** Off-day (but enabled) cells use
  `text-zinc-400`/`dark:text-zinc-600` and off-day weekday headers
  `text-zinc-300` — under AA. (Future cells are exempt: disabled controls have
  no contrast requirement.) Dimming is an intentional design signal; consider
  keeping AA-compliant ink and signaling off-days another way (e.g. ring/dot).

### A-2 · Repeated ambiguous control names for screen readers — Open (documented)

- **Where:** `HabitCard` (Edit/Archive/"Check in today"), `ArchivedHabitCard`
  (Restore/Delete)
- **Issue:** with several cards on screen, a screen-reader user tabbing or
  listing controls hears "Archive", "Archive", "Archive" … with no indication
  of which habit each button affects (the card heading is not part of the
  control's accessible name).
- **Recommendation:** include the habit name in the accessible name, e.g.
  `aria-label={`Archive ${habit.name}`}` or visually-hidden suffix text.
  Coordinate with the E2E selectors (`getByRole("button", { name: "Check in
today" })`) when doing so.

### P-1 · No Medium-severity performance findings

Checked for the requested classes and found the queries well-shaped:

- **No N+1:** the home page is 2 queries (habits with today-scoped check-ins +
  tag chips, both via `include`/`Promise.all`); stats is 1 query with an
  included relation; the calendar is 2 (habit + month-bounded check-ins).
- **No unnecessary client components:** all five `'use client'` files
  (HabitForm, AuthForm, ConfirmForm, ThemeToggle, WeeklyCompletionChart) need
  client APIs (`useActionState`, `window.confirm`, `localStorage`, Recharts)
  and carry the required justification comment. Everything else renders on the
  server.
- **Over-fetching:** the stats page loads _all_ check-in dates per habit, but
  the longest-streak computation genuinely needs full history; acceptable at
  personal-tracker scale (see L-11 for the eventual bound).

## Low

| #    | Finding                                                                                                                                                                                                                  | Where                                              | Status                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------- |
| L-1  | `archivedAt` rendered via `toISOString().slice(0, 10)` — an ad-hoc **UTC** date key, violating the project rule that all date keys come from `lib/date.ts`; shows the previous day for archives made 00:00–08:59 KST.    | `components/features/ArchivedHabitCard.tsx:27`     | **FIXED** — uses `toDateKey()` (Asia/Seoul) |
| L-2  | SQLite `LIKE` wildcards `%`/`_` are not escaped in the `?q=` search (`contains`), so `"100%"` over-matches. Own-data only; parameterized, no injection.                                                                  | `app/page.tsx:41-43`                               | Open                                        |
| L-3  | `/habits/[id]` runs the same scoped habit query twice per view (`generateMetadata` + page). Wrap in React `cache()` to dedupe.                                                                                           | `app/habits/[id]/page.tsx:20-39`                   | Open                                        |
| L-4  | Chart container is a role-less `div` with an `aria-label` (not announced); the Recharts SVG may expose stray text. The sr-only table already carries the data — add `role="img"`/`aria-hidden` split to silence the SVG. | `components/features/WeeklyCompletionChart.tsx:53` | Open                                        |
| L-5  | No skip-to-content link (nav is small, so tab cost is low).                                                                                                                                                              | `app/layout.tsx`                                   | Open                                        |
| L-6  | bcrypt cost factor 10 (12 is the common 2026 default); zod `max(72)` counts UTF-16 chars, not bytes — a multi-byte 72-char password exceeds bcrypt's 72-**byte** limit and truncates silently.                           | `actions/auth.ts:10`, `lib/auth-schema.ts:13-19`   | Open                                        |
| L-7  | `trustHost: true` unconditionally (required for `next start` on localhost); revisit if deployed behind an untrusted proxy.                                                                                               | `lib/auth-config.ts:25`                            | Open (documented)                           |
| L-8  | Server-side form errors appear visually but are not announced (`role="alert"`/`aria-live` missing), so SR users may miss a failed submit.                                                                                | `AuthForm.tsx`, `HabitForm.tsx`                    | Open                                        |
| L-9  | Signup reveals whether an email is registered ("account already exists") — standard UX tradeoff; unthrottled signup probing remains possible (S-2 covers login only).                                                    | `actions/auth.ts:35-39`                            | Open (accepted)                             |
| L-10 | The proxy matcher sends `/public` assets (e.g. `*.svg`) through the login redirect. Harmless today (assets unused) and fails closed — but surprising.                                                                    | `proxy.ts:34`                                      | Open (note)                                 |
| L-11 | Unbounded lists: all habits render on one page and stats loads all-time check-ins. Fine at personal scale; add pagination/windowing if the model ever grows.                                                             | `app/page.tsx`, `app/stats/page.tsx`               | Open (note)                                 |

## Positive observations

Things the codebase gets right (kept here so the findings above read in
proportion):

- **Ownership model is consistent and centralized** (`findOwnedHabit`, scoped
  `updateMany`, scoped page queries, "foreign id ≡ missing id" invariant, and
  an E2E test proving cross-user isolation end to end).
- **Duplicate check-ins are impossible at the database level**
  (`@@unique([habitId, date])`) and the expected race errors (`P2002`,
  `P2025`) are treated as "target state reached" rather than crashes.
- **Foreign-key enforcement verified ON** under `@prisma/adapter-better-sqlite3`
  (probed `PRAGMA foreign_keys` → `1`; a dangling insert is rejected with
  `P2003`), and `deleteHabit` additionally does its cleanup in an explicit
  `$transaction` — cascades are both declared and not blindly relied upon.
- **Input validation is server-side zod on every mutation**, with a color
  whitelist, a strict target-days mask, tag count/length caps, and a capped,
  normalized search query. Native browser validation is deliberately disabled
  so the server rules stay authoritative.
- **Auth hygiene:** bcrypt hashing, dummy-hash compare to equalize timing for
  unknown emails, no password echo into form state, JWT session cookie via
  Auth.js defaults (httpOnly), generic login error, and no `passwordHash`
  selection anywhere near the UI.
- **A11y groundwork:** every form control has a real or sr-only label with
  `aria-invalid`/`aria-describedby` wiring, calendar cells expose per-date
  `aria-label` + `aria-pressed`, tag filters use `nav` + `aria-current`, the
  chart ships an sr-only data table, and custom swatch/day pickers keep
  keyboard focus rings via `peer-focus-visible`.

---

_Fixes marked **FIXED** were applied in task p18 (see `bench-reports/p18.md`);
the full unit + E2E suite passes after the changes._
