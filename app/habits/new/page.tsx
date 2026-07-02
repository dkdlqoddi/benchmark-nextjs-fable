import type { Metadata } from "next";
import { createHabit } from "@/actions/habits";
import { HabitForm } from "@/components/features/HabitForm";

export const metadata: Metadata = {
  title: "New habit",
  description: "Create a habit: name, color, target days of the week, and tags.",
};

/** Page with the form for creating a new habit. */
export default function NewHabitPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New habit</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Give it a name and pick a color — you can always edit it later.
        </p>
      </div>
      <HabitForm action={createHabit} submitLabel="Create habit" />
    </section>
  );
}
