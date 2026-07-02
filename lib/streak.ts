import { addDays } from "./date";

/** Streak statistics computed from one habit's check-in dates. */
export type StreakStats = {
  /** Length of the run ending today (or yesterday when today is unchecked). */
  current: number;
  /** Length of the longest run of consecutive dates overall. */
  longest: number;
  /** Total number of check-ins. */
  total: number;
};

/**
 * Length of the streak that is still "alive" on `today`: the run of consecutive
 * checked dates ending at today, or at yesterday when today has no check-in yet.
 * Returns 0 when neither today nor yesterday is checked. Pure — `today` is a
 * YYYY-MM-DD key supplied by the caller.
 */
export function currentStreak(dates: readonly string[], today: string): number {
  const checked = new Set(dates);
  const anchor = checked.has(today) ? today : addDays(today, -1);
  if (!checked.has(anchor)) {
    return 0;
  }

  let length = 0;
  let cursor = anchor;
  while (checked.has(cursor)) {
    length += 1;
    cursor = addDays(cursor, -1);
  }
  return length;
}

/**
 * Length of the longest run of consecutive dates anywhere in the list,
 * independent of `today`. Pure; duplicate dates are collapsed defensively.
 */
export function longestStreak(dates: readonly string[]): number {
  const sorted = Array.from(new Set(dates)).sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === addDays(sorted[i - 1], 1) ? run + 1 : 1;
    if (run > longest) {
      longest = run;
    }
  }
  return longest;
}

/**
 * Computes all streak statistics for a list of YYYY-MM-DD check-in keys.
 * Pure function of its inputs; `today` anchors the current streak.
 */
export function computeStreaks(dates: readonly string[], today: string): StreakStats {
  return {
    current: currentStreak(dates, today),
    longest: longestStreak(dates),
    total: dates.length,
  };
}
