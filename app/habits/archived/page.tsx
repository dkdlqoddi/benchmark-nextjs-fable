import type { Metadata } from "next";
import Link from "next/link";
import { ArchivedHabitCard } from "@/components/features/ArchivedHabitCard";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Archive contents change at runtime, so always render per-request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Archived habits",
};

/** Page listing the user's archived habits with restore and permanent-delete actions. */
export default async function ArchivedHabitsPage() {
  const userId = await requireUserId();
  const habits = await prisma.habit.findMany({
    where: { userId, archivedAt: { not: null } },
    orderBy: { archivedAt: "desc" },
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Archived habits</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Restore a habit to keep tracking it, or delete it permanently.
        </p>
      </div>
      {habits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Nothing here — archived habits will show up on this page.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => (
            <li key={habit.id}>
              <ArchivedHabitCard habit={habit} />
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          ← Back to home
        </Link>
      </p>
    </section>
  );
}
