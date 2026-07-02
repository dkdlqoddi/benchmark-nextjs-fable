import { execSync } from "node:child_process";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The action needs a session and Next's cache — both are stubbed: requireUserId
// returns the test user, revalidatePath becomes a no-op spy. Everything else
// (zod-free date guards, Prisma on the scratch SQLite file) runs for real.
vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { toggleCheckInForDate } from "@/actions/check-ins";
import { requireUserId } from "@/lib/auth";
import { todayKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";

// Regression for the p14 user report: "I checked in at 11:55 PM, but the next
// morning it was recorded under the next day's date." Asia/Seoul is UTC+9, so
// the app's calendar day flips at 15:00 UTC. These instants sit on both sides:
const BEFORE_MIDNIGHT = "2026-07-01T14:59:59Z"; // 23:59:59 KST on July 1
const AFTER_MIDNIGHT = "2026-07-01T15:00:05Z"; // 00:00:05 KST on July 2

/** Freezes only Date (not timers — Prisma needs those) at a UTC instant. */
function freezeAt(utcInstant: string): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(utcInstant));
}

let habitId: string;

beforeAll(async () => {
  // Fresh schema on the scratch database (DATABASE_URL is fixed to
  // prisma/unit-test.db by vitest.config.mts, for the CLI and the app alike).
  execSync("rm -f prisma/unit-test.db* && npx prisma db push", { stdio: "pipe" });
  const user = await prisma.user.create({
    data: { email: "checkin-boundary@unit.test", passwordHash: "not-a-real-hash" },
  });
  const habit = await prisma.habit.create({
    data: { userId: user.id, name: "Midnight habit", color: "#ef4444" },
  });
  habitId = habit.id;
  vi.mocked(requireUserId).mockResolvedValue(user.id);
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.checkIn.deleteMany({});
});

afterEach(() => {
  vi.useRealTimers();
});

/** All stored check-in date keys for the test habit. */
async function storedDates(): Promise<string[]> {
  const rows = await prisma.checkIn.findMany({ where: { habitId }, select: { date: true } });
  return rows.map((row) => row.date);
}

describe("check-in toggle at the Seoul midnight boundary (p14 regression)", () => {
  it("a check-in processed at 23:59:59 KST is stored under that same day", async () => {
    freezeAt(BEFORE_MIDNIGHT);
    await toggleCheckInForDate(habitId, todayKey());
    expect(await storedDates()).toEqual(["2026-07-01"]);
  });

  it("the rendered day survives a request processed after midnight (the reported bug)", async () => {
    // The page rendered "Check in today" for July 1 before midnight…
    freezeAt(BEFORE_MIDNIGHT);
    const renderedToday = todayKey();
    expect(renderedToday).toBe("2026-07-01");

    // …but the click reaches the server just after Seoul midnight (stale tab,
    // slow network). The home card binds the rendered key, so the check-in
    // must land on July 1 — the old implicit-"today" wiring stored July 2.
    freezeAt(AFTER_MIDNIGHT);
    await toggleCheckInForDate(habitId, renderedToday);
    expect(await storedDates()).toEqual(["2026-07-01"]);

    // Toggling again from the same stale page removes that same day.
    await toggleCheckInForDate(habitId, renderedToday);
    expect(await storedDates()).toEqual([]);
  });

  it('documents why the report happened: an execution-time "today" flips at midnight', async () => {
    freezeAt(BEFORE_MIDNIGHT);
    const before = todayKey();
    freezeAt(AFTER_MIDNIGHT);
    const after = todayKey();
    // Five seconds apart, one calendar day apart — any code that re-derives
    // "today" when the request executes records the next day.
    expect(before).toBe("2026-07-01");
    expect(after).toBe("2026-07-02");
  });

  it("rejects a future date at the boundary (Seoul-tomorrow just before midnight)", async () => {
    freezeAt(BEFORE_MIDNIGHT);
    await toggleCheckInForDate(habitId, "2026-07-02");
    expect(await storedDates()).toEqual([]);
  });

  it("accepts yesterday's key the moment the day flips (back-filling stays possible)", async () => {
    freezeAt(AFTER_MIDNIGHT);
    await toggleCheckInForDate(habitId, "2026-07-01");
    expect(await storedDates()).toEqual(["2026-07-01"]);
  });

  it("rejects malformed date keys outright", async () => {
    freezeAt(BEFORE_MIDNIGHT);
    await toggleCheckInForDate(habitId, "2026-7-1");
    await toggleCheckInForDate(habitId, "not-a-date");
    expect(await storedDates()).toEqual([]);
  });

  it("rejects well-shaped keys that are not real calendar days (audit D-1)", async () => {
    // The date is a client-tamperable bound argument: shape alone must not be
    // enough — "2026-02-31" sorts before today, so only calendar validation
    // keeps it out of the table (where it would be an unremovable junk row).
    freezeAt(BEFORE_MIDNIGHT);
    await toggleCheckInForDate(habitId, "2026-02-31");
    await toggleCheckInForDate(habitId, "2025-13-40");
    await toggleCheckInForDate(habitId, "2025-04-31");
    expect(await storedDates()).toEqual([]);
  });
});
