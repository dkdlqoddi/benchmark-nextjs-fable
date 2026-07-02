import { describe, expect, it } from "vitest";
import { computeStreaks, currentStreak, longestStreak } from "@/lib/streak";
import { EVERY_DAY } from "@/lib/target-days";

// 2026-07-02 is a THURSDAY — the target-day cases below depend on that.
const TODAY = "2026-07-02";

// Masks: index 0 = Sunday … 6 = Saturday.
const MWF = "0101010"; // Mon / Wed / Fri
const TUE_THU = "0010100"; // Tue / Thu
const MON_ONLY = "0100000"; // Mon
const TUE_ONLY = "0010000"; // Tue
const WEEKDAYS = "0111110"; // Mon–Fri
const WEEKEND = "1000001"; // Sun / Sat

/** Builds the inclusive range of date keys from `start` to `end`. */
function range(start: string, end: string): string[] {
  const keys: string[] = [];
  const [year, month, day] = start.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    keys.push(key);
    if (key === end) {
      return keys;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

/** Asserts computeStreaks against expected current/longest (total = dates.length). */
function expectStreaks(
  dates: string[],
  targetDays: string,
  expected: { current: number; longest: number; total?: number },
  today: string = TODAY,
): void {
  expect(computeStreaks(dates, today, targetDays)).toEqual({
    current: expected.current,
    longest: expected.longest,
    total: expected.total ?? dates.length,
  });
}

// The original p04 spec cases (from scripts/verify-streak.ts): with an
// every-day mask the target-day rules reduce to the old today-or-yesterday
// behavior, so these must still pass.
describe("computeStreaks — every-day mask (original spec)", () => {
  it("1) [7/1, 7/2] -> current 2, longest 2", () => {
    expectStreaks(["2026-07-01", "2026-07-02"], EVERY_DAY, { current: 2, longest: 2 });
  });

  it("2) [6/30, 7/1] -> current 2, longest 2 (today unchecked, runs through yesterday)", () => {
    expectStreaks(["2026-06-30", "2026-07-01"], EVERY_DAY, { current: 2, longest: 2 });
  });

  it("3) [6/29, 6/30] -> current 0, longest 2 (neither today nor yesterday)", () => {
    expectStreaks(["2026-06-29", "2026-06-30"], EVERY_DAY, { current: 0, longest: 2 });
  });

  it("4) [] -> current 0, longest 0", () => {
    expectStreaks([], EVERY_DAY, { current: 0, longest: 0 });
  });

  it("5) [6/1-6/10, 6/20-7/2] -> current 13, longest 13", () => {
    expectStreaks(
      [...range("2026-06-01", "2026-06-10"), ...range("2026-06-20", "2026-07-02")],
      EVERY_DAY,
      { current: 13, longest: 13 },
    );
  });

  it("6) only today -> current 1, longest 1", () => {
    expectStreaks(["2026-07-02"], EVERY_DAY, { current: 1, longest: 1 });
  });

  it("7) only yesterday -> current 1, longest 1", () => {
    expectStreaks(["2026-07-01"], EVERY_DAY, { current: 1, longest: 1 });
  });

  it("8) unordered input, gap before today -> current 2, longest 3", () => {
    expectStreaks(
      ["2026-07-02", "2026-06-10", "2026-06-12", "2026-06-11", "2026-07-01"],
      EVERY_DAY,
      { current: 2, longest: 3 },
    );
  });

  it("9) streak across a month boundary counts through (6/28-7/1)", () => {
    expectStreaks(range("2026-06-28", "2026-07-01"), EVERY_DAY, { current: 4, longest: 4 });
  });
});

// Target-day rules (from scripts/verify-streak.ts): streaks only count target
// days; off-day check-ins are bonus (counted in total, ignored by streaks);
// a missed target day breaks the run — unless that target day is today,
// which isn't over yet.
describe("computeStreaks — target-day masks (original spec)", () => {
  it("T1) MWF: Mon 6/29 + Wed 7/1 checked, today Thu -> current 2 (alive across off-day)", () => {
    expectStreaks(["2026-06-29", "2026-07-01"], MWF, { current: 2, longest: 2 });
  });

  it("T2) MWF: bonus check-in on Tue 6/30 neither extends nor breaks (still 2/2, total 3)", () => {
    expectStreaks(["2026-06-29", "2026-06-30", "2026-07-01"], MWF, { current: 2, longest: 2 });
  });

  it("T3) Tue/Thu: today is a target Thu, unchecked -> grace runs through Tue 6/30", () => {
    expectStreaks(["2026-06-30"], TUE_THU, { current: 1, longest: 1 });
  });

  it("T4) Tue/Thu: Tue 6/30 + Thu 7/2 checked (Thu 6/25 missed) -> current 2, longest 2", () => {
    expectStreaks(["2026-06-30", "2026-07-02"], TUE_THU, { current: 2, longest: 2 });
  });

  it("T5) MWF: Wed 7/1 missed and it isn't today -> current 0, longest 1", () => {
    expectStreaks(["2026-06-29"], MWF, { current: 0, longest: 1 });
  });

  it("T6) Mon-only: Mon 6/22 + Mon 6/29 checked, Thu 6/25 bonus -> current 2 on an off-day", () => {
    expectStreaks(["2026-06-22", "2026-06-25", "2026-06-29"], MON_ONLY, {
      current: 2,
      longest: 2,
    });
  });

  it("T7) MWF: 6/1+6/3+6/5 run, then Mon 6/8 missed, then 6/29+7/1 -> longest 3, current 2", () => {
    expectStreaks(["2026-06-01", "2026-06-03", "2026-06-05", "2026-06-29", "2026-07-01"], MWF, {
      current: 2,
      longest: 3,
    });
  });

  it("T8) Weekdays: Fri 6/26 through Wed 7/1 checked, Thu unchecked -> current 4 (weekend skipped)", () => {
    expectStreaks(["2026-06-26", "2026-06-29", "2026-06-30", "2026-07-01"], WEEKDAYS, {
      current: 4,
      longest: 4,
    });
  });
});

describe("computeStreaks — year-boundary edge cases", () => {
  it("every-day streak runs across New Year (12/30-1/2)", () => {
    expectStreaks(
      ["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"],
      EVERY_DAY,
      { current: 4, longest: 4 },
      "2026-01-02",
    );
  });

  it("Jan 1 unchecked but is today -> grace runs through Dec 31", () => {
    expectStreaks(
      ["2025-12-30", "2025-12-31"],
      EVERY_DAY,
      { current: 2, longest: 2 },
      "2026-01-01",
    );
  });

  it("MWF streak crosses New Year (Mon 12/29, Wed 12/31, Fri 1/2)", () => {
    expectStreaks(
      ["2025-12-29", "2025-12-31", "2026-01-02"],
      MWF,
      { current: 3, longest: 3 },
      "2026-01-02",
    );
  });

  it("Mon-only streak crosses New Year (12/22, 12/29, 1/5)", () => {
    expectStreaks(
      ["2025-12-22", "2025-12-29", "2026-01-05"],
      MON_ONLY,
      { current: 3, longest: 3 },
      "2026-01-05",
    );
  });
});

describe("computeStreaks — leap-day edge cases", () => {
  it("2028 leap year: streak runs through Feb 29 (2/28-3/1)", () => {
    expectStreaks(
      ["2028-02-28", "2028-02-29", "2028-03-01"],
      EVERY_DAY,
      { current: 3, longest: 3 },
      "2028-03-01",
    );
  });

  it("2027 non-leap year: Feb 28 and Mar 1 are consecutive", () => {
    expectStreaks(
      ["2027-02-28", "2027-03-01"],
      EVERY_DAY,
      { current: 2, longest: 2 },
      "2027-03-01",
    );
  });

  it("2000 century leap year: Feb 29 exists and links 2/28 to 3/1", () => {
    expectStreaks(
      ["2000-02-28", "2000-02-29", "2000-03-01"],
      EVERY_DAY,
      { current: 3, longest: 3 },
      "2000-03-01",
    );
  });

  it("2100 century non-leap year: Feb 28 and Mar 1 are consecutive", () => {
    expectStreaks(
      ["2100-02-28", "2100-03-01"],
      EVERY_DAY,
      { current: 2, longest: 2 },
      "2100-03-01",
    );
  });

  it("Tue-only mask: run of Tuesdays spans Feb 29 2028 (a Tuesday)", () => {
    expectStreaks(
      ["2028-02-22", "2028-02-29", "2028-03-07"],
      TUE_ONLY,
      { current: 3, longest: 3 },
      "2028-03-07",
    );
  });
});

describe("computeStreaks — more target-day combinations", () => {
  it("weekend-only mask: Sat 6/27 + Sun 6/28 checked, today Thu -> current 2", () => {
    expectStreaks(["2026-06-27", "2026-06-28"], WEEKEND, { current: 2, longest: 2 });
  });

  it("MWF: only an off-day bonus check-in -> current 0, longest 0, total 1", () => {
    // 2026-06-30 is a Tuesday — an off-day for MWF.
    expectStreaks(["2026-06-30"], MWF, { current: 0, longest: 0 });
  });

  it("Tue/Thu: checked Tue 6/23 + Thu 6/25 but missed Tue 6/30 -> current 0, longest 2", () => {
    expectStreaks(["2026-06-23", "2026-06-25"], TUE_THU, { current: 0, longest: 2 });
  });

  it("weekdays mask: full Mon-Fri week bridged over the weekend to Mon-Thu -> current 9", () => {
    expectStreaks(
      [...range("2026-06-22", "2026-06-26"), ...range("2026-06-29", "2026-07-02")],
      WEEKDAYS,
      { current: 9, longest: 9 },
    );
  });
});

describe("computeStreaks — defensive input handling", () => {
  it('invalid mask "0000000" (no target day) falls back to every-day behavior', () => {
    expectStreaks(["2026-07-01", "2026-07-02"], "0000000", { current: 2, longest: 2 });
  });

  it('malformed masks ("10101", "abcdefg") fall back to every-day behavior', () => {
    expectStreaks(["2026-07-01", "2026-07-02"], "10101", { current: 2, longest: 2 });
    expectStreaks(["2026-07-01", "2026-07-02"], "abcdefg", { current: 2, longest: 2 });
  });

  it("duplicate dates do not inflate streaks but do count in total", () => {
    expectStreaks(["2026-07-02", "2026-07-02", "2026-07-01"], EVERY_DAY, {
      current: 2,
      longest: 2,
      total: 3,
    });
  });

  it("longest is independent of today; future-dated runs never feed current", () => {
    expect(longestStreak(["2026-07-04", "2026-07-05"], EVERY_DAY)).toBe(2);
    expect(currentStreak(["2026-07-04", "2026-07-05"], TODAY, EVERY_DAY)).toBe(0);
  });
});
