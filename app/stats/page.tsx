import type { Metadata } from "next";
import Link from "next/link";
import { HabitStatsCard } from "@/components/features/HabitStatsCard";
import { WeeklyCompletionChart } from "@/components/features/WeeklyCompletionChart";
import { Card } from "@/components/ui/Card";
import { requireUserId } from "@/lib/auth";
import { weeklyCompletionRates } from "@/lib/completion";
import { todayKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { computeStreaks } from "@/lib/streak";

const WEEKS_SHOWN = 8;

// Streaks depend on today's check-ins, so always render per-request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats",
};

/** Stats page: streaks and weekly completion for the signed-in user's habits. */
export default async function StatsPage() {
  const userId = await requireUserId();
  const today = todayKey();
  const habits = await prisma.habit.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { checkIns: { select: { date: true } } },
  });

  const weekly = weeklyCompletionRates(
    habits.flatMap((habit) => habit.checkIns.map((checkIn) => checkIn.date)),
    habits.length,
    today,
    WEEKS_SHOWN,
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Streaks count consecutive days; a streak survives until the end of today.
        </p>
      </div>
      {habits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No habits to analyze yet.{" "}
          <Link href="/habits/new" className="underline underline-offset-4">
            Create one
          </Link>{" "}
          to start tracking.
        </p>
      ) : (
        <Card>
          <h2 className="text-base font-semibold">Weekly completion</h2>
          <p className="mt-0.5 mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Share of possible daily check-ins completed, last {WEEKS_SHOWN} weeks (active habits;
            the current week counts days so far).
          </p>
          <WeeklyCompletionChart data={weekly} />
        </Card>
      )}
      {habits.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map(({ checkIns, ...habit }) => (
            <li key={habit.id}>
              <HabitStatsCard
                habit={habit}
                stats={computeStreaks(
                  checkIns.map((checkIn) => checkIn.date),
                  today,
                  habit.targetDays,
                )}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
