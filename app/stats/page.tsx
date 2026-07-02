import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stats",
};

/** Stats page placeholder — streaks and completion charts land here in a later task. */
export default function StatsPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Streaks and completion stats are coming soon.
      </p>
    </section>
  );
}
