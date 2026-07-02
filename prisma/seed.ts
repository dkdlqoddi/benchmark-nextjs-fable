import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { addDays, todayKey } from "../lib/date";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

/** Shared password of both test accounts. */
const PASSWORD = "password123";

const ACCOUNTS = [
  {
    email: "alice@test.com",
    habits: [
      {
        name: "Morning Run",
        description: "Run for at least 20 minutes before starting the day.",
        color: "#10b981",
      },
      {
        name: "Read 20 Pages",
        description: "Any book counts — fiction, non-fiction, or technical.",
        color: "#3b82f6",
      },
      {
        name: "Meditate",
        description: null,
        color: "#f59e0b",
      },
    ],
  },
  {
    email: "bob@test.com",
    habits: [
      {
        name: "Gym Session",
        description: "Strength or cardio, at least 45 minutes.",
        color: "#ef4444",
      },
      {
        name: "Journal",
        description: "Three sentences about the day.",
        color: "#8b5cf6",
      },
      {
        name: "Drink 2L Water",
        description: null,
        color: "#0ea5e9",
      },
    ],
  },
];

/** Returns random YYYY-MM-DD keys within the last `days` days (always at least one). */
function randomDateKeys(days: number): string[] {
  const today = todayKey();
  const keys: string[] = [];
  for (let daysAgo = 0; daysAgo < days; daysAgo++) {
    if (Math.random() < 0.6) {
      keys.push(addDays(today, -daysAgo));
    }
  }
  if (keys.length === 0) {
    keys.push(today);
  }
  return keys;
}

/**
 * Resets the database and seeds the 2 test accounts (alice@test.com and
 * bob@test.com, password "password123"), each with 3 own habits and random
 * check-ins over the last 2 weeks.
 */
async function main(): Promise<void> {
  await prisma.checkIn.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const account of ACCOUNTS) {
    const user = await prisma.user.create({
      data: { email: account.email, passwordHash },
    });
    for (const data of account.habits) {
      const habit = await prisma.habit.create({ data: { ...data, userId: user.id } });
      const checkIns = randomDateKeys(14).map((date) => ({
        habitId: habit.id,
        date,
      }));
      await prisma.checkIn.createMany({ data: checkIns });
      console.log(`Seeded ${account.email} / "${habit.name}" with ${checkIns.length} check-ins`);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
