import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HabitCalendar } from "@/components/features/HabitCalendar";
import { Card } from "@/components/ui/Card";
import { auth, requireUserId } from "@/lib/auth";
import { addMonths, dateKey, daysInMonth, monthLabel, monthParam, parseMonth } from "@/lib/date";
import { prisma } from "@/lib/prisma";

// Check-ins change at runtime, so always render per-request.
export const dynamic = "force-dynamic";

type HabitDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
};

/** Uses the habit's name as the page title — only if the habit is the user's own. */
export async function generateMetadata({ params }: HabitDetailProps): Promise<Metadata> {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const habit = session?.user
    ? await prisma.habit.findFirst({
        where: { id, userId: session.user.id },
        select: { name: true },
      })
    : null;
  return { title: habit?.name ?? "Habit" };
}

/** Habit detail page: monthly check-in calendar with prev/next navigation. */
export default async function HabitDetailPage({ params, searchParams }: HabitDetailProps) {
  const userId = await requireUserId();
  const [{ id }, { month: monthQuery }] = await Promise.all([params, searchParams]);
  // Scoped lookup: another user's habit id 404s exactly like a missing one.
  const habit = await prisma.habit.findFirst({ where: { id, userId } });
  if (!habit) {
    notFound();
  }

  const month = parseMonth(monthQuery);
  const checkIns = await prisma.checkIn.findMany({
    where: {
      habitId: habit.id,
      date: {
        gte: dateKey(month.year, month.month, 1),
        lte: dateKey(month.year, month.month, daysInMonth(month.year, month.month)),
      },
    },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  const prev = monthParam(addMonths(month, -1));
  const next = monthParam(addMonths(month, 1));

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: habit.color }}
          />
          <h1 className="truncate text-2xl font-bold tracking-tight">{habit.name}</h1>
        </div>
        {habit.description ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{habit.description}</p>
        ) : null}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/habits/${habit.id}?month=${prev}`}
            aria-label="Previous month"
            className="rounded-md px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            ‹
          </Link>
          <h2 className="text-sm font-semibold">{monthLabel(month)}</h2>
          <Link
            href={`/habits/${habit.id}?month=${next}`}
            aria-label="Next month"
            className="rounded-md px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            ›
          </Link>
        </div>
        <HabitCalendar
          habitId={habit.id}
          color={habit.color}
          month={month}
          checkedDates={checkIns.map((checkIn) => checkIn.date)}
        />
        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {checkIns.length} check-in{checkIns.length === 1 ? "" : "s"} in {monthLabel(month)} ·
          click a past day to toggle it
        </p>
      </Card>

      <p className="flex gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          ← Back to home
        </Link>
        <Link
          href={`/habits/${habit.id}/edit`}
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Edit habit
        </Link>
      </p>
    </section>
  );
}
