import { toggleCheckInForDate } from "@/actions/check-ins";
import {
  dateKey,
  daysInMonth,
  firstWeekday,
  isFutureKey,
  todayKey,
  type YearMonth,
} from "@/lib/date";
import { isTargetDate, WEEKDAY_LABELS } from "@/lib/target-days";

type HabitCalendarProps = {
  habitId: string;
  /** Habit color used to fill checked dates (data-driven inline style). */
  color: string;
  /** The habit's target-days mask; off-day cells render dimmed. */
  targetDays: string;
  month: YearMonth;
  /** YYYY-MM-DD keys of this month's checked dates. */
  checkedDates: string[];
};

/**
 * Monthly check-in calendar. Past and today cells are submit buttons that
 * toggle that date's check-in via a server action; future cells are disabled.
 * Checked dates are filled with the habit's color. Cells on days outside the
 * habit's target days are dimmed but stay clickable (off-day check-ins are
 * allowed — they just don't count toward streaks).
 */
export function HabitCalendar({
  habitId,
  color,
  targetDays,
  month,
  checkedDates,
}: HabitCalendarProps) {
  const checked = new Set(checkedDates);
  const today = todayKey();
  const leadingBlanks = firstWeekday(month.year, month.month);
  const totalDays = daysInMonth(month.year, month.month);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((weekday, index) => (
          <div
            key={weekday}
            className={`py-1 text-xs font-medium ${
              targetDays[index] === "1"
                ? "text-zinc-500 dark:text-zinc-400"
                : "text-zinc-300 dark:text-zinc-600"
            }`}
          >
            {weekday}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} aria-hidden />
        ))}
        {Array.from({ length: totalDays }, (_, index) => {
          const day = index + 1;
          const key = dateKey(month.year, month.month, day);
          const isChecked = checked.has(key);
          const isToday = key === today;
          const isFuture = isFutureKey(key);
          const isTarget = isTargetDate(targetDays, key);

          const base =
            "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors";
          const state = isChecked
            ? `font-semibold text-white${isTarget ? "" : " opacity-60"}`
            : isFuture
              ? "text-zinc-300 dark:text-zinc-700"
              : isTarget
                ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                : "text-zinc-400 hover:bg-zinc-100 dark:text-zinc-600 dark:hover:bg-zinc-800";
          const todayRing = isToday
            ? " ring-2 ring-zinc-400 ring-offset-1 ring-offset-white dark:ring-zinc-500 dark:ring-offset-zinc-950"
            : "";

          return (
            <form key={key} action={toggleCheckInForDate.bind(null, habitId, key)}>
              <button
                type="submit"
                disabled={isFuture}
                aria-pressed={isChecked}
                aria-label={`Toggle check-in for ${key}`}
                className={`${base} ${state}${todayRing} disabled:cursor-not-allowed`}
                style={isChecked ? { backgroundColor: color } : undefined}
              >
                {day}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
