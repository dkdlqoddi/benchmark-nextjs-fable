import Link from "next/link";
import { toggleCheckInForDate } from "@/actions/check-ins";
import { archiveHabit } from "@/actions/habits";
import { Card } from "@/components/ui/Card";
import type { Habit, Tag } from "@/lib/generated/prisma/client";
import { targetDaysLabel } from "@/lib/target-days";

type HabitCardProps = {
  habit: Habit & { tags: Pick<Tag, "id" | "name">[] };
  /**
   * The date key this card was rendered for (todayKey() at render time). The
   * toggle binds this exact key so a click always toggles the day the button
   * displayed — even when the request is processed after Seoul midnight
   * (stale tab, slow network). Never re-derive "today" at execution time here.
   */
  today: string;
  /** Whether the habit already has a check-in for `today`. */
  checkedToday: boolean;
  /** Whether `today` is one of the habit's target days; off-days dim the toggle. */
  isTargetToday: boolean;
};

/**
 * Card for a single habit: color swatch, name (links to the calendar detail
 * page), target-day label, optional description, tag chips (linking to the
 * filtered home page), a "check in today" toggle (dimmed on off-days, but
 * still active), and Edit / Archive actions. Swatch and checked-state colors
 * are user data from the database, so they are applied as inline styles
 * rather than Tailwind tokens.
 */
export function HabitCard({ habit, today, checkedToday, isTargetToday }: HabitCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: habit.color }}
        />
        <h2 className="truncate text-base font-semibold">
          <Link href={`/habits/${habit.id}`} className="hover:underline underline-offset-4">
            {habit.name}
          </Link>
        </h2>
      </div>
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
        {targetDaysLabel(habit.targetDays)}
      </p>
      {habit.description ? (
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {habit.description}
        </p>
      ) : null}
      {habit.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {habit.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/?tag=${encodeURIComponent(tag.name)}`}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      ) : null}
      <form action={toggleCheckInForDate.bind(null, habit.id, today)} className="mt-4">
        <button
          type="submit"
          aria-pressed={checkedToday}
          title={isTargetToday ? undefined : "Not a target day — check-ins still count"}
          className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            checkedToday
              ? "border-transparent text-white"
              : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }${isTargetToday ? "" : " opacity-60"}`}
          style={checkedToday ? { backgroundColor: habit.color } : undefined}
        >
          {checkedToday ? "✓ Done today" : isTargetToday ? "Check in today" : "Check in (off day)"}
        </button>
      </form>
      <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <Link
          href={`/habits/${habit.id}/edit`}
          className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          Edit
        </Link>
        <form action={archiveHabit.bind(null, habit.id)}>
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Archive
          </button>
        </form>
      </div>
    </Card>
  );
}
