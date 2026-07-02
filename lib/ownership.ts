import type { Habit } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The user-scoped habit lookup every habit/check-in mutation gates on: returns
 * the habit only when it exists AND belongs to `userId`. A foreign habit id
 * yields null exactly like a missing one, so callers cannot tell the two apart
 * (invariant: never query a habit by bare id).
 */
export async function findOwnedHabit(userId: string, habitId: string): Promise<Habit | null> {
  return prisma.habit.findFirst({ where: { id: habitId, userId } });
}
