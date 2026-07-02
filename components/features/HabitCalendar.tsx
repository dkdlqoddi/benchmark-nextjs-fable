import { toggleCheckInForDate } from "@/actions/check-ins";
import {
  dateKey,
  daysInMonth,
  firstWeekday,
  isFutureKey,
  todayKey,
  type YearMonth,
} from "@/lib/date";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type HabitCalendarProps = {
  habitId: string;
  /** Habit color used to fill checked dates (data-driven inline style). */
  color: string;
  month: YearMonth;
  /** YYYY-MM-DD keys of this month's checked dates. */
  checkedDates: string[];
};

/**
 * Monthly check-in calendar. Past and today cells are submit buttons that
 * toggle that date's check-in via a server action; future cells are disabled.
 * Checked dates are filled with the habit's color.
 */
export function HabitCalendar({ habitId, color, month, checkedDates }: HabitCalendarProps) {
  const checked = new Set(checkedDates);
  const today = todayKey();
  const leadingBlanks = firstWeekday(month.year, month.month);
  const totalDays = daysInMonth(month.year, month.month);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
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

          const base =
            "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors";
          const state = isChecked
            ? "font-semibold text-white"
            : isFuture
              ? "text-zinc-300 dark:text-zinc-700"
              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";
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
