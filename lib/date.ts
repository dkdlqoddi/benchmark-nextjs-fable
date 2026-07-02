/** IANA timezone every calendar computation in the app is fixed to. */
export const APP_TIME_ZONE = "Asia/Seoul";

const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Formats an instant as a YYYY-MM-DD key in the app timezone (Asia/Seoul). */
export function toDateKey(date: Date): string {
  return keyFormatter.format(date);
}

/** Returns today's YYYY-MM-DD key in the app timezone (Asia/Seoul). */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** Builds a YYYY-MM-DD key from calendar parts (month is 1-12). */
export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Returns the key `days` days after the given YYYY-MM-DD key (negative = before). */
export function addDays(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** True when the key is a calendar day after today (app timezone). */
export function isFutureKey(key: string): boolean {
  return key > todayKey();
}

/** Start (Sunday) of the calendar week containing the given key, matching the calendar UI. */
export function startOfWeek(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(key, -weekday);
}

const shortLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** Compact label for a date key, e.g. "Jun 7". */
export function shortDateLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return shortLabelFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

/** Number of days in the given month (month is 1-12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Weekday of the 1st of the month (0 = Sunday … 6 = Saturday). */
export function firstWeekday(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

/** A calendar month as year + 1-12 month number. */
export type YearMonth = { year: number; month: number };

/** Current month in the app timezone. */
export function currentMonth(): YearMonth {
  const [year, month] = todayKey().split("-").map(Number);
  return { year, month };
}

/**
 * Parses a YYYY-MM query value; falls back to the current month (app timezone)
 * when the value is missing or malformed.
 */
export function parseMonth(value: string | undefined): YearMonth {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return { year, month };
  }
  return currentMonth();
}

/** Serializes a YearMonth back to its YYYY-MM query form. */
export function monthParam({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Returns the month shifted by `delta` months (handles year boundaries). */
export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
});

/** Human label for a month, e.g. "July 2026". */
export function monthLabel({ year, month }: YearMonth): string {
  return monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}
