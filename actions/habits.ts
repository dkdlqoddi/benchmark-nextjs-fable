"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import { parseHabitForm, type HabitFormState } from "@/lib/habit-schema";
import { prisma } from "@/lib/prisma";

/** Builds the nested payload attaching normalized tag names to a habit (user-scoped). */
function tagsConnectOrCreate(userId: string, names: readonly string[]) {
  return names.map((name) => ({
    where: { userId_name: { userId, name } },
    create: { userId, name },
  }));
}

/** Deletes the user's tags that no longer label any habit (post-mutation hygiene). */
async function deleteOrphanTags(userId: string): Promise<void> {
  await prisma.tag.deleteMany({ where: { userId, habits: { none: {} } } });
}

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

  const { tags, ...habitData } = parsed.data;
  await prisma.habit.create({
    data: { ...habitData, userId, tags: { connectOrCreate: tagsConnectOrCreate(userId, tags) } },
  });
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

  const { tags, ...habitData } = parsed.data;
  await prisma.habit.update({
    where: { id: habitId },
    // `set: []` first: the submitted list fully replaces the previous tags.
    data: {
      ...habitData,
      tags: { set: [], connectOrCreate: tagsConnectOrCreate(userId, tags) },
    },
  });
  await deleteOrphanTags(userId);
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
  // Scoped ownership gate: a foreign or unknown habit id is a silent no-op.
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) {
    return;
  }
  // Explicitly detach tags and delete check-ins in the same transaction rather
  // than relying on SQLite enforcing FK cascades (PRAGMA foreign_keys is
  // driver-dependent), then drop tags that no longer label any habit.
  try {
    await prisma.$transaction([
      prisma.habit.update({ where: { id: habitId }, data: { tags: { set: [] } } }),
      prisma.checkIn.deleteMany({ where: { habitId } }),
      prisma.habit.delete({ where: { id: habitId } }),
      prisma.tag.deleteMany({ where: { userId, habits: { none: {} } } }),
    ]);
  } catch (error) {
    // A concurrent delete may have removed the habit after the gate; the
    // target state (habit gone) is already reached.
    const isMissing =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
    if (!isMissing) {
      throw error;
    }
  }
  revalidatePath("/habits/archived");
}
