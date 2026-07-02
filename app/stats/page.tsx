import type { Metadata } from "next";
import Link from "next/link";
import { HabitStatsCard } from "@/components/features/HabitStatsCard";
import { todayKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { computeStreaks } from "@/lib/streak";

// Streaks depend on today's check-ins, so always render per-request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats",
};

/** Stats page: current streak, longest streak, and total check-ins per habit. */
export default async function StatsPage() {
  const today = todayKey();
  const habits = await prisma.habit.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { checkIns: { select: { date: true } } },
  });

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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map(({ checkIns, ...habit }) => (
            <li key={habit.id}>
              <HabitStatsCard
                habit={habit}
                stats={computeStreaks(
                  checkIns.map((checkIn) => checkIn.date),
                  today,
                )}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
