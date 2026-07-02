"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseHabitForm, type HabitFormState } from "@/lib/habit-schema";
import { prisma } from "@/lib/prisma";

/** Creates a habit from form data; returns per-field errors or redirects home. */
export async function createHabit(
  _prevState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const parsed = parseHabitForm(formData);
  if (!parsed.success) {
    return parsed.state;
  }

  await prisma.habit.create({ data: parsed.data });
  revalidatePath("/");
  redirect("/");
}

/** Updates an existing habit from form data; returns per-field errors or redirects home. */
export async function updateHabit(
  habitId: string,
  _prevState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const parsed = parseHabitForm(formData);
  if (!parsed.success) {
    return parsed.state;
  }

  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) {
    return { status: "error", formError: "This habit no longer exists." };
  }

  await prisma.habit.update({ where: { id: habitId }, data: parsed.data });
  revalidatePath("/");
  redirect("/");
}

/** Archives a habit (sets archivedAt) so it is hidden from the home list. */
export async function archiveHabit(habitId: string): Promise<void> {
  await prisma.habit.update({
    where: { id: habitId },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/");
  revalidatePath("/habits/archived");
}

/** Restores an archived habit back onto the home list. */
export async function restoreHabit(habitId: string): Promise<void> {
  await prisma.habit.update({
    where: { id: habitId },
    data: { archivedAt: null },
  });
  revalidatePath("/");
  revalidatePath("/habits/archived");
}

/** Permanently deletes an archived habit together with all of its check-ins. */
export async function deleteHabit(habitId: string): Promise<void> {
  // Explicitly delete check-ins in the same transaction rather than relying on
  // SQLite enforcing the FK cascade (PRAGMA foreign_keys is driver-dependent).
  await prisma.$transaction([
    prisma.checkIn.deleteMany({ where: { habitId } }),
    prisma.habit.delete({ where: { id: habitId } }),
  ]);
  revalidatePath("/habits/archived");
}
