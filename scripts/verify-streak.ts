import { computeStreaks } from "../lib/streak";
import { EVERY_DAY } from "../lib/target-days";

// 2026-07-02 is a THURSDAY — the target-day cases below depend on that.
const TODAY = "2026-07-02";

// Masks: index 0 = Sunday … 6 = Saturday.
const MWF = "0101010"; // Mon / Wed / Fri
const TUE_THU = "0010100"; // Tue / Thu
const MON_ONLY = "0100000"; // Mon
const WEEKDAYS = "0111110"; // Mon–Fri

/** Builds the inclusive range of date keys from `start` to `end`. */
function range(start: string, end: string): string[] {
  const keys: string[] = [];
  const [year, month, day] = start.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    keys.push(key);
    if (key === end) {
      return keys;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

type Case = {
  name: string;
  dates: string[];
  targetDays: string;
  expected: { current: number; longest: number };
};

// The original p04 spec cases: with an every-day mask the target-day rules
// reduce to the old today-or-yesterday behavior, so these must still pass.
const EVERY_DAY_CASES: Case[] = [
  {
    name: "1) [7/1, 7/2] -> current 2, longest 2",
    dates: ["2026-07-01", "2026-07-02"],
    targetDays: EVERY_DAY,
    expected: { current: 2, longest: 2 },
  },
  {
    name: "2) [6/30, 7/1] -> current 2, longest 2 (today unchecked, runs through yesterday)",
    dates: ["2026-06-30", "2026-07-01"],
    targetDays: EVERY_DAY,
    expected: { current: 2, longest: 2 },
  },
  {
    name: "3) [6/29, 6/30] -> current 0, longest 2 (neither today nor yesterday)",
    dates: ["2026-06-29", "2026-06-30"],
    targetDays: EVERY_DAY,
    expected: { current: 0, longest: 2 },
  },
  {
    name: "4) [] -> current 0, longest 0",
    dates: [],
    targetDays: EVERY_DAY,
    expected: { current: 0, longest: 0 },
  },
  {
    name: "5) [6/1-6/10, 6/20-7/2] -> current 13, longest 13",
    dates: [...range("2026-06-01", "2026-06-10"), ...range("2026-06-20", "2026-07-02")],
    targetDays: EVERY_DAY,
    expected: { current: 13, longest: 13 },
  },
  {
    name: "6) only today -> current 1, longest 1",
    dates: ["2026-07-02"],
    targetDays: EVERY_DAY,
    expected: { current: 1, longest: 1 },
  },
  {
    name: "7) only yesterday -> current 1, longest 1",
    dates: ["2026-07-01"],
    targetDays: EVERY_DAY,
    expected: { current: 1, longest: 1 },
  },
  {
    name: "8) unordered input, gap before today -> current 2, longest 3",
    dates: ["2026-07-02", "2026-06-10", "2026-06-12", "2026-06-11", "2026-07-01"],
    targetDays: EVERY_DAY,
    expected: { current: 2, longest: 3 },
  },
  {
    name: "9) streak across a month boundary counts through (6/28-7/1)",
    dates: range("2026-06-28", "2026-07-01"),
    targetDays: EVERY_DAY,
    expected: { current: 4, longest: 4 },
  },
];

// Target-day rules: streaks only count target days; off-day check-ins are
// bonus (counted in total, ignored by streaks); a missed target day breaks
// the run — unless that target day is today, which isn't over yet.
const TARGET_DAY_CASES: Case[] = [
  {
    name: "T1) MWF: Mon 6/29 + Wed 7/1 checked, today Thu -> current 2 (alive across off-day)",
    dates: ["2026-06-29", "2026-07-01"],
    targetDays: MWF,
    expected: { current: 2, longest: 2 },
  },
  {
    name: "T2) MWF: bonus check-in on Tue 6/30 neither extends nor breaks (still 2/2, total 3)",
    dates: ["2026-06-29", "2026-06-30", "2026-07-01"],
    targetDays: MWF,
    expected: { current: 2, longest: 2 },
  },
  {
    name: "T3) Tue/Thu: today is a target Thu, unchecked -> grace runs through Tue 6/30",
    dates: ["2026-06-30"],
    targetDays: TUE_THU,
    expected: { current: 1, longest: 1 },
  },
  {
    name: "T4) Tue/Thu: Tue 6/30 + Thu 7/2 checked (Thu 6/25 missed) -> current 2, longest 2",
    dates: ["2026-06-30", "2026-07-02"],
    targetDays: TUE_THU,
    expected: { current: 2, longest: 2 },
  },
  {
    name: "T5) MWF: Wed 7/1 missed and it isn't today -> current 0, longest 1",
    dates: ["2026-06-29"],
    targetDays: MWF,
    expected: { current: 0, longest: 1 },
  },
  {
    name: "T6) Mon-only: Mon 6/22 + Mon 6/29 checked, Thu 6/25 bonus -> current 2 on an off-day",
    dates: ["2026-06-22", "2026-06-25", "2026-06-29"],
    targetDays: MON_ONLY,
    expected: { current: 2, longest: 2 },
  },
  {
    name: "T7) MWF: 6/1+6/3+6/5 run, then Mon 6/8 missed, then 6/29+7/1 -> longest 3, current 2",
    dates: ["2026-06-01", "2026-06-03", "2026-06-05", "2026-06-29", "2026-07-01"],
    targetDays: MWF,
    expected: { current: 2, longest: 3 },
  },
  {
    name: "T8) Weekdays: Fri 6/26 through Wed 7/1 checked, Thu unchecked -> current 4 (weekend skipped)",
    dates: ["2026-06-26", "2026-06-29", "2026-06-30", "2026-07-01"],
    targetDays: WEEKDAYS,
    expected: { current: 4, longest: 4 },
  },
];

let failures = 0;
for (const testCase of [...EVERY_DAY_CASES, ...TARGET_DAY_CASES]) {
  const { current, longest, total } = computeStreaks(testCase.dates, TODAY, testCase.targetDays);
  const ok =
    current === testCase.expected.current &&
    longest === testCase.expected.longest &&
    total === testCase.dates.length;
  if (!ok) {
    failures += 1;
  }
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${testCase.name}` +
      (ok
        ? ""
        : `  got current=${current} longest=${longest} total=${total}, ` +
          `expected current=${testCase.expected.current} longest=${testCase.expected.longest} total=${testCase.dates.length}`),
  );
}

console.log(failures === 0 ? "\nALL STREAK CASES PASSED" : `\n${failures} CASE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
