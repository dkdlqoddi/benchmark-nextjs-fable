import { Card } from "@/components/ui/Card";
import type { Habit } from "@/lib/generated/prisma/client";

/**
 * Card for a single habit showing its color swatch, name, and optional description.
 * The swatch color is user data from the database, so it is applied as an inline
 * style rather than a Tailwind token.
 */
export function HabitCard({ habit }: { habit: Habit }) {
  return (
    <Card className="h-full">
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
    </Card>
  );
}
