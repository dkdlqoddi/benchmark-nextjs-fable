import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  addMonths,
  currentMonth,
  dateKey,
  daysInMonth,
  firstWeekday,
  isFutureKey,
  isValidDateKey,
  monthLabel,
  monthParam,
  parseMonth,
  shortDateLabel,
  startOfWeek,
  toDateKey,
  todayKey,
  weekday,
} from "@/lib/date";

/** Freezes the clock at the given UTC instant (restored in afterEach). */
function freezeAt(utcInstant: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(utcInstant));
}

afterEach(() => {
  vi.useRealTimers();
});

// Asia/Seoul is UTC+9 with no DST: the calendar day flips at 15:00 UTC.
describe("toDateKey — Asia/Seoul day boundaries", () => {
  it("one millisecond before 15:00 UTC is still the same Seoul day", () => {
    expect(toDateKey(new Date("2026-07-01T14:59:59.999Z"))).toBe("2026-07-01");
  });

  it("exactly 15:00 UTC is Seoul midnight of the next day", () => {
    expect(toDateKey(new Date("2026-07-01T15:00:00.000Z"))).toBe("2026-07-02");
  });

  it("late UTC evening already belongs to the next Seoul day (differs from UTC date)", () => {
    expect(toDateKey(new Date("2026-07-01T20:00:00Z"))).toBe("2026-07-02");
  });

  it("UTC midnight is 09:00 in Seoul — same calendar day", () => {
    expect(toDateKey(new Date("2026-07-02T00:00:00Z"))).toBe("2026-07-02");
  });

  it("the year flips at 15:00 UTC on Dec 31", () => {
    expect(toDateKey(new Date("2025-12-31T14:59:59Z"))).toBe("2025-12-31");
    expect(toDateKey(new Date("2025-12-31T15:00:00Z"))).toBe("2026-01-01");
  });
});

describe("todayKey / isFutureKey — frozen clock at a timezone boundary", () => {
  it("todayKey rolls to the next day at 15:00 UTC", () => {
    freezeAt("2026-07-01T14:59:59Z");
    expect(todayKey()).toBe("2026-07-01");
    vi.setSystemTime(new Date("2026-07-01T15:00:00Z"));
    expect(todayKey()).toBe("2026-07-02");
  });

  it("isFutureKey compares against the Seoul today, not the UTC today", () => {
    // 20:00 UTC on July 1 is already July 2 in Seoul.
    freezeAt("2026-07-01T20:00:00Z");
    expect(isFutureKey("2026-07-01")).toBe(false);
    expect(isFutureKey("2026-07-02")).toBe(false);
    expect(isFutureKey("2026-07-03")).toBe(true);
    expect(isFutureKey("2026-10-01")).toBe(true);
  });
});

describe("isValidDateKey — real calendar days only (audit D-1)", () => {
  it("accepts canonical keys for real days", () => {
    expect(isValidDateKey("2026-07-02")).toBe(true);
    expect(isValidDateKey("2026-01-01")).toBe(true);
    expect(isValidDateKey("2026-12-31")).toBe(true);
    expect(isValidDateKey("2028-02-29")).toBe(true); // leap day
  });

  it("rejects malformed shapes", () => {
    expect(isValidDateKey("2026-7-2")).toBe(false);
    expect(isValidDateKey("20260702")).toBe(false);
    expect(isValidDateKey("not-a-date")).toBe(false);
    expect(isValidDateKey("")).toBe(false);
    expect(isValidDateKey("2026-07-02T00:00")).toBe(false);
  });

  it("rejects well-shaped keys that are not calendar days", () => {
    expect(isValidDateKey("2026-02-31")).toBe(false); // no Feb 31
    expect(isValidDateKey("2027-02-29")).toBe(false); // 2027 is not a leap year
    expect(isValidDateKey("2100-02-29")).toBe(false); // century non-leap
    expect(isValidDateKey("2025-13-01")).toBe(false); // month 13
    expect(isValidDateKey("2025-00-10")).toBe(false); // month 0
    expect(isValidDateKey("2025-04-31")).toBe(false); // April has 30 days
    expect(isValidDateKey("2025-06-00")).toBe(false); // day 0
  });
});

describe("addDays — month, year, and leap boundaries", () => {
  it("crosses month boundaries in both directions", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-07-01", -1)).toBe("2026-06-30");
  });

  it("crosses year boundaries in both directions", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles Feb 29 in leap years (2028, 2000) and its absence otherwise (2027, 2100)", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2000-02-28", 1)).toBe("2000-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2100-02-28", 1)).toBe("2100-03-01");
  });

  it("shifts whole years, honouring leap length", () => {
    expect(addDays("2027-03-01", 366)).toBe("2028-03-01"); // spans Feb 29 2028
    expect(addDays("2026-03-01", 365)).toBe("2027-03-01");
  });

  it("zero and negative offsets", () => {
    expect(addDays("2026-07-02", 0)).toBe("2026-07-02");
    expect(addDays("2026-07-02", -35)).toBe("2026-05-28");
  });
});

describe("weekday / startOfWeek", () => {
  it("weekday uses 0 = Sunday … 6 = Saturday", () => {
    expect(weekday("2026-07-02")).toBe(4); // Thursday
    expect(weekday("2026-07-05")).toBe(0); // Sunday
    expect(weekday("2026-07-04")).toBe(6); // Saturday
    expect(weekday("2028-02-29")).toBe(2); // leap day 2028 is a Tuesday
  });

  it("startOfWeek returns the Sunday, crossing month/year boundaries when needed", () => {
    expect(startOfWeek("2026-07-02")).toBe("2026-06-28"); // Thu -> previous Sunday, month crossed
    expect(startOfWeek("2026-06-28")).toBe("2026-06-28"); // a Sunday maps to itself
    expect(startOfWeek("2026-01-01")).toBe("2025-12-28"); // year crossed
  });
});

describe("dateKey / daysInMonth / firstWeekday / labels", () => {
  it("dateKey zero-pads month and day", () => {
    expect(dateKey(2026, 7, 2)).toBe("2026-07-02");
    expect(dateKey(2026, 12, 31)).toBe("2026-12-31");
  });

  it("daysInMonth knows leap Februaries (incl. century rules)", () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2026, 6)).toBe(30);
    expect(daysInMonth(2026, 7)).toBe(31);
  });

  it("firstWeekday matches the calendar (July 2026 starts on a Wednesday)", () => {
    expect(firstWeekday(2026, 7)).toBe(3);
  });

  it("labels are stable regardless of server timezone", () => {
    expect(shortDateLabel("2026-06-07")).toBe("Jun 7");
    expect(monthLabel({ year: 2026, month: 7 })).toBe("July 2026");
  });
});

describe("currentMonth / parseMonth — Seoul month at a UTC month boundary", () => {
  it("currentMonth is the Seoul month even when UTC is still in the previous month", () => {
    // 16:00 UTC on June 30 is already 01:00 on July 1 in Seoul.
    freezeAt("2026-06-30T16:00:00Z");
    expect(currentMonth()).toEqual({ year: 2026, month: 7 });
  });

  it("parseMonth accepts well-formed YYYY-MM values", () => {
    expect(parseMonth("2026-07")).toEqual({ year: 2026, month: 7 });
    expect(parseMonth("2026-01")).toEqual({ year: 2026, month: 1 });
    expect(parseMonth("2026-12")).toEqual({ year: 2026, month: 12 });
  });

  it("parseMonth falls back to the current Seoul month for missing or malformed values", () => {
    freezeAt("2026-06-30T16:00:00Z"); // Seoul: 2026-07-01
    const fallback = { year: 2026, month: 7 };
    expect(parseMonth(undefined)).toEqual(fallback);
    expect(parseMonth("")).toEqual(fallback);
    expect(parseMonth("garbage")).toEqual(fallback);
    expect(parseMonth("2026-13")).toEqual(fallback);
    expect(parseMonth("2026-0")).toEqual(fallback);
    expect(parseMonth("2026-7")).toEqual(fallback); // month must be two digits
  });
});

// Regression (p14): "I checked in at 11:55 PM, but the next morning it was
// recorded under the next day's date."
describe("regression: 11:55 PM check-ins at the Seoul midnight boundary", () => {
  it("11:55 PM in Seoul still belongs to that day; minutes past midnight does not", () => {
    expect(toDateKey(new Date("2026-07-01T14:55:00Z"))).toBe("2026-07-01"); // 23:55 KST July 1
    expect(toDateKey(new Date("2026-07-01T15:05:00Z"))).toBe("2026-07-02"); // 00:05 KST July 2
  });

  it("11:55 PM for a user west of Seoul is already Seoul's next day (by design)", () => {
    // 23:55 on July 1 in New York (UTC-4 in July) = 03:55 UTC = 12:55 KST on
    // July 2: the app's single-timezone policy stores such a check-in under
    // July 2 — the reported symptom, without any code defect.
    expect(toDateKey(new Date("2026-07-02T03:55:00Z"))).toBe("2026-07-02");
  });
});

describe("addMonths / monthParam — year boundaries", () => {
  it("crosses year boundaries in both directions", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("handles multi-month and multi-year deltas", () => {
    expect(addMonths({ year: 2026, month: 7 }, 12)).toEqual({ year: 2027, month: 7 });
    expect(addMonths({ year: 2026, month: 7 }, -7)).toEqual({ year: 2025, month: 12 });
  });

  it("monthParam round-trips through parseMonth with zero-padding", () => {
    expect(monthParam({ year: 2026, month: 7 })).toBe("2026-07");
    expect(parseMonth(monthParam({ year: 2027, month: 1 }))).toEqual({ year: 2027, month: 1 });
  });
});
