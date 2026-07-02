import type { Metadata } from "next";
import Link from "next/link";
import { HabitCard } from "@/components/features/HabitCard";
import { HabitSearch } from "@/components/features/HabitSearch";
import { TagFilter } from "@/components/features/TagFilter";
import { requireUserId } from "@/lib/auth";
import { todayKey } from "@/lib/date";
import { homeHref, normalizeSearchQuery } from "@/lib/home-filters";
import { prisma } from "@/lib/prisma";
import { normalizeTagName } from "@/lib/tags";
import { isTargetDate } from "@/lib/target-days";

// Habit data changes at runtime, so always render this page per-request.
export const dynamic = "force-dynamic";

// Title falls back to the layout default ("HabitLog") — this is the home page.
export const metadata: Metadata = {
  description: "Your active habits with today's check-ins, filterable by tag and search.",
};

type HomeProps = {
  searchParams: Promise<{ tag?: string; q?: string }>;
};

/**
 * Home page: the signed-in user's active habits with today's check-in state,
 * filterable by tag (?tag= chips) and by free-text search (?q= across name,
 * description, and tag names) — the two filters compose.
 */
export default async function Home({ searchParams }: HomeProps) {
  const userId = await requireUserId();
  const { tag, q } = await searchParams;
  const activeTag = tag ? normalizeTagName(tag) || undefined : undefined;
  const query = normalizeSearchQuery(q);
  const today = todayKey();

  const [habits, tags] = await Promise.all([
    prisma.habit.findMany({
      where: {
        userId,
        archivedAt: null,
        ...(activeTag ? { tags: { some: { name: activeTag } } } : {}),
        // SQLite LIKE makes `contains` case-insensitive for ASCII.
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { description: { contains: query } },
                { tags: { some: { name: { contains: normalizeTagName(query) } } } },
              ],
            }
          : {}),
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

  const hasFilters = Boolean(activeTag || query);
  const filterSuffix = `${activeTag ? ` tagged #${activeTag}` : ""}${
    query ? ` matching “${query}”` : ""
  }`;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your habits</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {habits.length === 0
              ? hasFilters
                ? "No habits match."
                : "Nothing here yet."
              : `Tracking ${habits.length} habit${habits.length === 1 ? "" : "s"}${filterSuffix}.`}{" "}
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
      {habits.length > 0 || hasFilters ? (
        <div className="space-y-3">
          <HabitSearch query={query} activeTag={activeTag} />
          {tags.length > 0 ? (
            <TagFilter tags={tags.map((entry) => entry.name)} activeTag={activeTag} query={query} />
          ) : null}
        </div>
      ) : null}
      {habits.length === 0 ? (
        hasFilters ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No habits{activeTag ? " tagged " : ""}
            {activeTag ? <span className="font-medium">#{activeTag}</span> : null}
            {query ? (
              <>
                {" "}
                matching <span className="font-medium">“{query}”</span>
              </>
            ) : null}
            .{" "}
            <Link href={homeHref({})} className="underline underline-offset-4">
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
                today={today}
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
