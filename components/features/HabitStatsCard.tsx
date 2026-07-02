import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { Habit } from "@/lib/generated/prisma/client";
import type { StreakStats } from "@/lib/streak";

type HabitStatsCardProps = {
  habit: Habit;
  stats: StreakStats;
};

/** One stat tile: sentence-case label above a semibold value with optional unit. */
function StatTile({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-2xl font-semibold">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">{unit}</span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * Stats card for one habit: identity row (color swatch + name linking to the
 * calendar) above current streak / longest streak / total check-in tiles.
 * Values stay in text ink; only the swatch carries the habit color (data-driven
 * inline style).
 */
export function HabitStatsCard({ habit, stats }: HabitStatsCardProps) {
  return (
    <Card className="h-full">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: habit.color }}
        />
        <h2 className="truncate text-base font-semibold">
          <Link href={`/habits/${habit.id}`} className="underline-offset-4 hover:underline">
            {habit.name}
          </Link>
        </h2>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-4">
        <StatTile
          label="Current streak"
          value={stats.current}
          unit={stats.current === 1 ? "day" : "days"}
        />
        <StatTile
          label="Longest streak"
          value={stats.longest}
          unit={stats.longest === 1 ? "day" : "days"}
        />
        <StatTile label="Total check-ins" value={stats.total} />
      </dl>
    </Card>
  );
}
