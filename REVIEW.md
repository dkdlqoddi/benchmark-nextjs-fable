# REVIEW — the three weakest parts of HabitLog

A critical retrospective of the project as built through p21. Selection
criteria: **user impact × how deeply the decision is coupled into the code ×
how avoidable it was with information available at the time**. Items already
fixed (p18 security findings, the p19 recharts bundle) are excluded; this is
about what's still weak today. Open findings from `AUDIT.md` are referenced
where they overlap. No code is changed by this review.

---

## 1. The core interaction — daily check-in — is a blind, toggle-semantics round trip

**What it is.** Checking in is the one thing users do every day, and it is the
least engineered interaction in the app. The home card and every calendar day
cell render a bare `<form action={toggleCheckInForDate.bind(...)}>`
(`components/features/HabitCard.tsx:67`, `components/features/HabitCalendar.tsx:82`
— one form per day, ~31 per month view). The action is a _toggle_ (delete-if-
exists, else create), and the UI has **no pending state and no optimistic
update anywhere** — `useFormStatus`/`useOptimistic` appear nowhere in the
codebase. Every click is a full server round trip with zero feedback until the
page revalidates.

**Why it's the weakest.**

- _Correctness:_ toggle semantics mean a double-click or retried request
  silently inverts the user's intent (audit **D-3** — two "check me in"
  clicks net to unchecked). The database can't help: both writes are
  individually valid.
- _Fragility under timing:_ the p19 loading-boundary work demonstrated the
  flow's sensitivity — with a root Suspense boundary, check-in clicks were
  intermittently _lost_ in E2E. The fix was to remove the boundary, i.e. the
  interaction only works because the rest of the page keeps out of its way.
- _Perceived performance:_ the hottest path in a habit tracker gives no
  acknowledgment for 100–300ms (or longer on a slow connection) and there is
  nothing stopping impatient re-clicks — the exact input that triggers D-3.
- _Avoidability:_ React 19 + Next server actions ship the tools for this
  (`useOptimistic`, `useFormStatus`) and the project already accepts small
  justified client islands (forms, theme). Choosing bare forms here wasn't a
  constraint — it was under-investment in the most-used feature.

**Improvement plan** (half a day, plus test migration):

1. Replace the toggle with a **desired-state action**:
   `setCheckInForDate(habitId, date, checked)` — create-if-missing when
   `checked=true` (P2002 = already done), deleteMany when `false` (0 rows =
   already done). Replays and double-submits become idempotent by
   construction; D-3 dies at the API level.
2. Add one small client island, `CheckInButton` (`'use client'` with the
   required justification comment): `useOptimistic` flips the visual state
   instantly, `useFormStatus` disables re-submission while pending, errors
   roll back to server truth on revalidate.
3. Calendar cells reuse the same island (props: date key, current state); the
   31-forms structure can stay — it's semantically fine — or collapse to one
   form with `formAction` per button as a cosmetic follow-up.
4. Test migration: the p13/p14 unit tests target `toggleCheckInForDate`
   heavily (midnight-boundary regressions). Port them to the new action
   _verbatim in intent_ (same frozen-clock scenarios, now asserting
   idempotency too: two identical `checked=true` calls → one row). Keep the
   bound-date-key behavior (the p14 invariant) untouched. E2E selectors
   ("Check in today" / "✓ Done today") remain valid.
5. Risk: low — the action is additive; remove the old toggle only after the
   ports are green.

---

## 2. The calendar is hardwired to Asia/Seoul for every user on Earth

**What it is.** `lib/date.ts` pins `APP_TIME_ZONE = "Asia/Seoul"` and every
"what day is it" computation in the app flows through it (`todayKey()`,
calendar rendering, future-date guards, streak anchoring, weekly buckets).
There is no user timezone anywhere in the schema, and the UI never states
which timezone it is using.

**Why it's the most regrettable.**

- _It already produced the project's one real user incident:_ the p14 report
  ("checked in at 11:55 PM, next morning it was under the next day") had two
  mechanisms, and only one — the stale-tab race — was fixable in code. The
  other is the policy itself: for a user in New York, 11:55 PM local _is_
  Seoul's next day, and the app records what looks like the wrong date
  forever. p14's own report says so and defers it as a "product decision";
  p15/p16/p21 have carried it since.
- _Silent wrongness:_ nothing in the UI says "Today = July 3, Seoul time."
  A user can't even diagnose the surprise; streaks break at 3 PM local time
  for US-East users with no visible reason.
- _Coupling:_ the constant looks small, but it anchors `todayKey()` — which
  the home page, cards, calendar, stats, and the future-date validation all
  call — and the test suite deliberately runs under `TZ=America/New_York` to
  prove the _pinning_ works. The decision is load-bearing everywhere dates
  exist.
- _Avoidability:_ the pure helpers already take `today`/keys as parameters
  (good instincts in `lib/streak.ts`, `lib/completion.ts`); the hardcode
  lives only at the boundary. A `timeZone` parameter at that boundary was
  cheap on day one; it's a schema migration plus an audit of every call site
  now.

**Improvement plan** (1–2 days, staged):

1. **Interim, same-day win (no schema change):** surface the policy — show
   "Today: Jul 2 (Seoul)" beside the check-in UI and in Settings. Turns
   silent wrongness into visible behavior; directly addresses the p14
   confusion at near-zero risk.
2. Schema: `User.timezone String @default("Asia/Seoul")`, validated against
   `Intl.supportedValuesOf("timeZone")` in a zod schema; migration keeps
   existing users on Seoul (no data reinterpretation — check-in keys stay
   as recorded).
3. Thread it: `todayKey(tz)` / `toDateKey(date, tz)` take the zone as a
   required parameter (grep-driven sweep of call sites; the compiler finds
   them all once the default-less signature lands). Pages resolve the
   session user's zone once per request and pass it down — same pattern as
   the existing `today` prop threading.
4. Settings page grows a timezone picker (finally un-placeholdering it),
   defaulting to the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`
   with explicit confirmation.
5. Tests: the existing Seoul-boundary specs stay (now as the default-zone
   case); add one mirrored suite for a second zone (e.g. `America/New_York`)
   and one for the day a user _changes_ zones (past keys unchanged, "today"
   moves — document that streaks may shift at the boundary, which is honest
   and expected).
6. Risk: medium — the change is wide but shallow, and the parameterization
   step is compiler-enforced. The product decision (per-user zones at all)
   is the real gate; step 1 is worth doing regardless of the verdict.

---

## 3. Habit colors are raw hex strings stored as row data

**What it is.** A habit's color is one of 8 hardcoded hex values
(`lib/habit-colors.ts`) persisted verbatim in the `Habit.color` column
(`prisma/schema.prisma`: "`color` is a hex string") and painted via inline
styles. The same 500-scale hex is used in light and dark mode, and white text
is placed on top of it for the checked state.

**Why it's weak.**

- _Presentation stored as data:_ the palette can never be tuned without a
  data migration — every rendered pixel of color is frozen into user rows.
  Rebranding, dark-mode-specific fills, or fixing a bad hue all mean
  rewriting the `Habit` table, not editing a constant.
- _It already fails accessibility, measurably:_ audit **A-1b** — white
  14px text on **all 8** presets misses WCAG AA (amber ≈ 2.1:1 up to violet
  ≈ 4.2:1, vs the required 4.5). The dimmed off-day treatment (**A-1c**)
  compounds it. The fix is blocked precisely because color semantics live in
  data: there is no place to attach "and use this ink on top" per color.
- _Dark mode got no say:_ Tailwind 500-scale hexes are tuned for white
  surfaces; on `zinc-900` cards several presets sit muddier than their
  light-mode selves. The one-hex-fits-both design forecloses per-surface
  tuning that the rest of the app (chart tokens in `globals.css`) already
  does correctly — the better pattern existed in-repo.
- _Avoidability:_ storing a **key** ("emerald") instead of a value was the
  same effort on day one; `isHabitColor` already whitelists exactly 8
  entries, proving the domain was always an enum.

**Improvement plan** (about a day, mostly mechanical):

1. Extend `lib/habit-colors.ts` to a keyed palette:
   `{ key: "emerald", label, fill: {light, dark}, ink: {light, dark} }` —
   fills chosen so the paired ink passes AA on both surfaces (drop to
   600/700-scale fills with white ink, or keep 500s with near-black ink);
   validate with the dataviz six-checks script like the chart accent was.
2. Schema: add `Habit.colorKey String` + backfill migration mapping the 8
   known hexes → keys (the whitelist guarantees totality; unknown values —
   there should be none — fall back to a default). Keep `color` one release
   for rollback, then drop it.
3. Rendering: swatches and checked states read
   `paletteFor(habit.colorKey)[mode]`. Inline styles remain (data-driven
   color, per project rule 5) but now resolve through the palette map. CSS
   variables per key are an alternative if inline styles should shrink.
4. This closes audit A-1b (and most of A-1c) _structurally_ instead of
   nudging hexes; seed data and the form's radio values switch to keys;
   tests touching `#ef4444` (unit habit fixtures, E2E creation flow) update
   mechanically.
5. Risk: low-medium — the migration is a total function over 8 values; the
   visual change is the point (before/after screenshots for both modes
   should ship with the PR).

---

## Honorable mentions (real, but not top-3)

- **The login rate limiter is in-memory** (p18, self-inflicted): correct for
  a single node, but a restart clears lockouts and a second instance shares
  nothing — while a durable `LoginAttempt` table on the already-present
  SQLite was one migration away. Regret-lite: documented, tested, easy to
  swap.
- **JWT sessions are irrevocable** until expiry (no logout-everywhere, no
  rotation on a future password change). Semi-forced by Auth.js credentials
  - JWT pairing, so less "regrettable" than constrained — but it caps how
    far account features can go without a session-store migration.
- **Tag lifecycle GC**: `connectOrCreate` + post-hoc orphan sweeps
  (`deleteOrphanTags`) outside a transaction (audit D-4) is subtle for what
  it buys; a join-model with counted cleanup — or accepting orphans until a
  periodic sweep — would be simpler to reason about.
- **ARCHITECTURE.md has no update discipline**: p08 wrote it, p16 touched it
  last, and p18–p19 made it wrong (still documents recharts). Docs that
  don't ride along with changes rot silently — a PR-checklist line ("does
  ARCHITECTURE.md §11 still hold?") is the cheap fix.
