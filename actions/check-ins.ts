"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isFutureKey } from "@/lib/date";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Creates the check-in unless it already exists, then deletes it — i.e.
 * toggles it. Only touches habits owned by the signed-in user: a foreign or
 * unknown habit id is a silent no-op.
 */
async function toggleCheckIn(habitId: string, date: string): Promise<void> {
  const userId = await requireUserId();
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) {
    return;
  }

  const removed = await prisma.checkIn.deleteMany({ where: { habitId, date } });
  if (removed.count === 0) {
    try {
      await prisma.checkIn.create({ data: { habitId, date } });
    } catch (error) {
      // A concurrent submit may have created it first; the unique violation
      // means the toggle target state is already reached.
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!isUniqueViolation) {
        throw error;
      }
    }
  }

  revalidatePath("/");
  revalidatePath(`/habits/${habitId}`);
}

/**
 * Toggles the check-in of one calendar date (home card button and calendar
 * cell click — both bind the date key they rendered, so a click toggles the
 * day the user saw even when processed after Seoul midnight).
 * Rejects malformed keys and future dates server-side, mirroring the disabled UI.
 */
export async function toggleCheckInForDate(habitId: string, date: string): Promise<void> {
  if (!DATE_KEY_PATTERN.test(date) || isFutureKey(date)) {
    return;
  }
  await toggleCheckIn(habitId, date);
}
