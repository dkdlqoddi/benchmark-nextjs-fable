"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { parseHabitForm, type HabitFormState } from "@/lib/habit-schema";
import { prisma } from "@/lib/prisma";

/** Creates a habit owned by the signed-in user; returns per-field errors or redirects home. */
export async function createHabit(
  _prevState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const userId = await requireUserId();
  const parsed = parseHabitForm(formData);
  if (!parsed.success) {
    return parsed.state;
  }

  await prisma.habit.create({ data: { ...parsed.data, userId } });
  revalidatePath("/");
  redirect("/");
}

/** Updates one of the user's habits from form data; returns per-field errors or redirects home. */
export async function updateHabit(
  habitId: string,
  _prevState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const userId = await requireUserId();
  const parsed = parseHabitForm(formData);
  if (!parsed.success) {
    return parsed.state;
  }

  // Scoped lookup: someone else's habit id behaves exactly like a missing one.
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) {
    return { status: "error", formError: "This habit no longer exists." };
  }

  await prisma.habit.update({ where: { id: habitId }, data: parsed.data });
  revalidatePath("/");
  redirect("/");
}

/** Archives one of the user's habits (no-op for foreign or unknown ids). */
export async function archiveHabit(habitId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.habit.updateMany({
    where: { id: habitId, userId },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/");
  revalidatePath("/habits/archived");
}

/** Restores one of the user's archived habits (no-op for foreign or unknown ids). */
export async function restoreHabit(habitId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.habit.updateMany({
    where: { id: habitId, userId },
    data: { archivedAt: null },
  });
  revalidatePath("/");
  revalidatePath("/habits/archived");
}

/** Permanently deletes one of the user's habits with all of its check-ins. */
export async function deleteHabit(habitId: string): Promise<void> {
  const userId = await requireUserId();
  // Explicitly delete check-ins in the same transaction rather than relying on
  // SQLite enforcing the FK cascade (PRAGMA foreign_keys is driver-dependent).
  // Both statements are user-scoped: a foreign habit id deletes nothing.
  await prisma.$transaction([
    prisma.checkIn.deleteMany({ where: { habitId, habit: { userId } } }),
    prisma.habit.deleteMany({ where: { id: habitId, userId } }),
  ]);
  revalidatePath("/habits/archived");
}
