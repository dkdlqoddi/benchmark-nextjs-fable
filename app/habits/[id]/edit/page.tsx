import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateHabit } from "@/actions/habits";
import { HabitForm } from "@/components/features/HabitForm";
import { prisma } from "@/lib/prisma";

// Always read the habit fresh so the form shows current values.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit habit",
};

/** Page for editing an existing habit, reusing the shared habit form. */
export default async function EditHabitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const habit = await prisma.habit.findUnique({ where: { id } });
  if (!habit) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit habit</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Changes apply everywhere once you save.
        </p>
      </div>
      <HabitForm
        action={updateHabit.bind(null, habit.id)}
        initialValues={{
          name: habit.name,
          description: habit.description,
          color: habit.color,
        }}
        submitLabel="Save changes"
      />
    </section>
  );
}
