import Link from "next/link";
import { HabitCard } from "@/components/features/HabitCard";
import { TagFilter } from "@/components/features/TagFilter";
import { requireUserId } from "@/lib/auth";
import { todayKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { normalizeTagName } from "@/lib/tags";
import { isTargetDate } from "@/lib/target-days";

// Habit data changes at runtime, so always render this page per-request.
export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ tag?: string }>;
};

/**
 * Home page: the signed-in user's active habits with today's check-in state,
 * filterable by tag via the ?tag= query (chips above the list).
 */
export default async function Home({ searchParams }: HomeProps) {
  const userId = await requireUserId();
  const { tag } = await searchParams;
  const activeTag = tag ? normalizeTagName(tag) || undefined : undefined;
  const today = todayKey();

  const [habits, tags] = await Promise.all([
    prisma.habit.findMany({
      where: {
        userId,
        archivedAt: null,
        ...(activeTag ? { tags: { some: { name: activeTag } } } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: {
        checkIns: { where: { date: today }, select: { id: true } },
        tags: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
    // Chips list: every tag that labels at least one active habit of the user.
    prisma.tag.findMany({
      where: { userId, habits: { some: { archivedAt: null } } },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your habits</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {habits.length === 0
              ? activeTag
                ? "No habits match this tag."
                : "Nothing here yet."
              : `Tracking ${habits.length} habit${habits.length === 1 ? "" : "s"}${
                  activeTag ? ` tagged #${activeTag}` : ""
                }.`}{" "}
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
      {tags.length > 0 ? (
        <TagFilter tags={tags.map((entry) => entry.name)} activeTag={activeTag} />
      ) : null}
      {habits.length === 0 ? (
        activeTag ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No habits tagged <span className="font-medium">#{activeTag}</span>.{" "}
            <Link href="/" className="underline underline-offset-4">
              Show all habits
            </Link>
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No habits yet. Create one with “New habit” or seed sample data with{" "}
            <code className="font-mono text-zinc-700 dark:text-zinc-300">npm run db:seed</code>.
          </p>
        )
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
