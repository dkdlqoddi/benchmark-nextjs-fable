import { addDays, weekday } from "./date";

/**
 * Target days are stored on the habit as a 7-char 0/1 mask, index 0 = Sunday
 * … 6 = Saturday (the same weekday numbering as lib/date.ts). "1111111" means
 * every day. A valid mask has at least one target day — the walk helpers
 * below rely on that to terminate.
 */
export const EVERY_DAY = "1111111";

/** Short weekday labels indexed like the mask (0 = Sunday). */
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** True when `value` is a valid mask: seven 0/1 chars with at least one target day. */
export function isTargetDaysMask(value: string): boolean {
  return /^[01]{7}$/.test(value) && value.includes("1");
}

/** Returns the mask itself when valid, otherwise "every day" (guards stale DB data). */
export function normalizeTargetDays(mask: string): string {
  return isTargetDaysMask(mask) ? mask : EVERY_DAY;
}

/** True when the mask marks the given date key's weekday as a target day. */
export function isTargetDate(mask: string, key: string): boolean {
  return mask[weekday(key)] === "1";
}

/** The latest target day on or before `key` (walks back ≤ 6 days on a valid mask). */
export function latestTargetDayOnOrBefore(mask: string, key: string): string {
  let cursor = key;
  while (!isTargetDate(mask, cursor)) {
    cursor = addDays(cursor, -1);
  }
  return cursor;
}

/** The latest target day strictly before `key`. */
export function previousTargetDay(mask: string, key: string): string {
  return latestTargetDayOnOrBefore(mask, addDays(key, -1));
}

/** The earliest target day strictly after `key` (walks forward ≤ 7 days on a valid mask). */
export function nextTargetDay(mask: string, key: string): string {
  let cursor = addDays(key, 1);
  while (!isTargetDate(mask, cursor)) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/** Human label for a mask, e.g. "Every day" or "Mon, Wed, Fri". */
export function targetDaysLabel(mask: string): string {
  if (normalizeTargetDays(mask) === EVERY_DAY) {
    return "Every day";
  }
  return WEEKDAY_LABELS.filter((_, index) => mask[index] === "1").join(", ");
}
