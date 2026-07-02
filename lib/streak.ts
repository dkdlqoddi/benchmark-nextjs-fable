import {
  latestTargetDayOnOrBefore,
  nextTargetDay,
  normalizeTargetDays,
  previousTargetDay,
  isTargetDate,
} from "./target-days";

/** Streak statistics computed from one habit's check-in dates. */
export type StreakStats = {
  /** Length of the target-day run that is still alive today. */
  current: number;
  /** Length of the longest run of consecutive target days overall. */
  longest: number;
  /** Total number of check-ins (bonus check-ins on off-days included). */
  total: number;
};

/**
 * Length of the streak that is still "alive" on `today`, counting only the
 * habit's target days: the run of consecutively checked target days ending at
 * the latest target day on or before today — or, when that latest target day
 * IS today and today is still unchecked, ending at the previous target day
 * (today isn't over yet). Off-day check-ins neither extend nor break the run.
 * Returns 0 when the anchor target day is unchecked. Pure — `today` is a
 * YYYY-MM-DD key and `targetDays` a 0/1 mask supplied by the caller.
 */
export function currentStreak(dates: readonly string[], today: string, targetDays: string): number {
  const mask = normalizeTargetDays(targetDays);
  const checked = new Set(dates);

  const latest = latestTargetDayOnOrBefore(mask, today);
  const anchor = !checked.has(latest) && latest === today ? previousTargetDay(mask, today) : latest;
  if (!checked.has(anchor)) {
    return 0;
  }

  let length = 0;
  let cursor = anchor;
  while (checked.has(cursor)) {
    length += 1;
    cursor = previousTargetDay(mask, cursor);
  }
  return length;
}

/**
 * Length of the longest run of consecutively checked target days anywhere in
 * the list, independent of `today`. Check-ins on off-days are ignored; a run
 * continues when the next target day after a checked target day is checked
 * too. Pure; duplicate dates are collapsed defensively.
 */
export function longestStreak(dates: readonly string[], targetDays: string): number {
  const mask = normalizeTargetDays(targetDays);
  const sorted = Array.from(new Set(dates))
    .filter((date) => isTargetDate(mask, date))
    .sort();

  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === nextTargetDay(mask, sorted[i - 1]) ? run + 1 : 1;
    if (run > longest) {
      longest = run;
    }
  }
  return longest;
}

/**
 * Computes all streak statistics for a list of YYYY-MM-DD check-in keys.
 * Streaks count only the habit's target days (`targetDays` mask, 0 = Sunday);
 * `total` counts every check-in including off-day bonuses. Pure function of
 * its inputs; `today` anchors the current streak.
 */
export function computeStreaks(
  dates: readonly string[],
  today: string,
  targetDays: string,
): StreakStats {
  return {
    current: currentStreak(dates, today, targetDays),
    longest: longestStreak(dates, targetDays),
    total: dates.length,
  };
}
