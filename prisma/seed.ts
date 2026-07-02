import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { addDays, todayKey } from "../lib/date";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const HABITS = [
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

/** Resets the database and seeds 3 habits with random check-ins over the last 2 weeks. */
async function main(): Promise<void> {
  await prisma.checkIn.deleteMany();
  await prisma.habit.deleteMany();

  for (const data of HABITS) {
    const habit = await prisma.habit.create({ data });
    const checkIns = randomDateKeys(14).map((date) => ({
      habitId: habit.id,
      date,
    }));
    await prisma.checkIn.createMany({ data: checkIns });
    console.log(`Seeded "${habit.name}" with ${checkIns.length} check-ins`);
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
