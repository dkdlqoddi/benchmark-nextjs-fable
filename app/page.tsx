import { HabitCard } from "@/components/features/HabitCard";
import { prisma } from "@/lib/prisma";

// Habit data changes at runtime, so always render this page per-request.
export const dynamic = "force-dynamic";

/** Home page: lists all active (non-archived) habits as cards. */
export default async function Home() {
  const habits = await prisma.habit.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "asc" },
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your habits</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {habits.length === 0
            ? "Nothing here yet."
            : `Tracking ${habits.length} habit${habits.length === 1 ? "" : "s"}.`}
        </p>
      </div>
      {habits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No habits yet. Seed the database with{" "}
          <code className="font-mono text-zinc-700 dark:text-zinc-300">npm run db:seed</code> to get
          started.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => (
            <li key={habit.id}>
              <HabitCard habit={habit} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
