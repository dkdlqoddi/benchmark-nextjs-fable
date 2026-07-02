import { deleteHabit, restoreHabit } from "@/actions/habits";
import { Card } from "@/components/ui/Card";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import type { Habit } from "@/lib/generated/prisma/client";

/**
 * Card for an archived habit with Restore and permanent Delete actions.
 * Delete asks for confirmation and also removes the habit's check-ins.
 */
export function ArchivedHabitCard({ habit }: { habit: Habit }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: habit.color }}
        />
        <h2 className="truncate text-base font-semibold">{habit.name}</h2>
      </div>
      {habit.description ? (
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {habit.description}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        Archived {habit.archivedAt ? habit.archivedAt.toISOString().slice(0, 10) : ""}
      </p>
      <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <form action={restoreHabit.bind(null, habit.id)}>
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Restore
          </button>
        </form>
        <ConfirmForm
          action={deleteHabit.bind(null, habit.id)}
          message={`Delete "${habit.name}" and all of its check-ins permanently? This cannot be undone.`}
        >
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete
          </button>
        </ConfirmForm>
      </div>
    </Card>
  );
}
