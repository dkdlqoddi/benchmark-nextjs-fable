import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateHabit } from "@/actions/habits";
import { HabitForm } from "@/components/features/HabitForm";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Always read the habit fresh so the form shows current values.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit habit",
};

/** Page for editing one of the user's habits, reusing the shared habit form. */
export default async function EditHabitPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  // Scoped lookup: another user's habit id 404s exactly like a missing one.
  const habit = await prisma.habit.findFirst({ where: { id, userId } });
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
          targetDays: habit.targetDays,
        }}
        submitLabel="Save changes"
      />
    </section>
  );
}
