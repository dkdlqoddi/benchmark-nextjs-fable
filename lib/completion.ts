import { addDays, startOfWeek } from "./date";

/** Completion rate of one calendar week (Sunday-start, matching the calendar UI). */
export type WeeklyRate = {
  /** YYYY-MM-DD of the week's Sunday. */
  weekStart: string;
  /** YYYY-MM-DD of the week's Saturday. */
  weekEnd: string;
  /** Check-ins made in the week (across all counted habits). */
  checkIns: number;
  /** Possible check-ins: habit count × days of the week elapsed up to today. */
  possible: number;
  /** checkIns / possible in 0..1; 0 when nothing was possible. */
  rate: number;
};

/**
 * Computes per-week completion rates for the `weeks` calendar weeks ending with
 * the week containing `today`. `dates` is the multiset of check-in keys across
 * the counted habits (one entry per habit per day). Pure function: `today`
 * anchors the window and caps the current week's possible days.
 */
export function weeklyCompletionRates(
  dates: readonly string[],
  habitCount: number,
  today: string,
  weeks: number,
): WeeklyRate[] {
  const countByDate = new Map<string, number>();
  for (const date of dates) {
    if (date <= today) {
      countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
    }
  }

  const currentWeekStart = startOfWeek(today);
  const result: WeeklyRate[] = [];
  for (let weeksAgo = weeks - 1; weeksAgo >= 0; weeksAgo--) {
    const weekStart = addDays(currentWeekStart, -7 * weeksAgo);
    let checkIns = 0;
    let elapsedDays = 0;
    for (let offset = 0; offset < 7; offset++) {
      const day = addDays(weekStart, offset);
      if (day > today) {
        break;
      }
      elapsedDays += 1;
      checkIns += countByDate.get(day) ?? 0;
    }
    const possible = habitCount * elapsedDays;
    result.push({
      weekStart,
      weekEnd: addDays(weekStart, 6),
      checkIns,
      possible,
      rate: possible === 0 ? 0 : checkIns / possible,
    });
  }
  return result;
}
