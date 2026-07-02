import Link from "next/link";
import { HabitCard } from "@/components/features/HabitCard";
import { requireUserId } from "@/lib/auth";
import { todayKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { isTargetDate } from "@/lib/target-days";

// Habit data changes at runtime, so always render this page per-request.
export const dynamic = "force-dynamic";

/** Home page: lists the signed-in user's active (non-archived) habits with today's state. */
export default async function Home() {
  const userId = await requireUserId();
  const today = todayKey();
  const habits = await prisma.habit.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { checkIns: { where: { date: today }, select: { id: true } } },
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your habits</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {habits.length === 0
              ? "Nothing here yet."
              : `Tracking ${habits.length} habit${habits.length === 1 ? "" : "s"}.`}{" "}
            <Link href="/habits/archived" className="underline-offset-4 hover:underline">
              View archived
            </Link>
          </p>
        </div>
        <Link
          href="/habits/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          New habit
        </Link>
      </div>
      {habits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No habits yet. Create one with “New habit” or seed sample data with{" "}
          <code className="font-mono text-zinc-700 dark:text-zinc-300">npm run db:seed</code>.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map(({ checkIns, ...habit }) => (
            <li key={habit.id}>
              <HabitCard
                habit={habit}
                checkedToday={checkIns.length > 0}
                isTargetToday={isTargetDate(habit.targetDays, today)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
