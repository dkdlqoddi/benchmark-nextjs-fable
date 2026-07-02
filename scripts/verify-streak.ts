import { computeStreaks } from "../lib/streak";

const TODAY = "2026-07-02";

/** Builds the inclusive range of date keys from `start` to `end` (same month-safe). */
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
  expected: { current: number; longest: number };
};

const SPEC_CASES: Case[] = [
  {
    name: "1) [7/1, 7/2] -> current 2, longest 2",
    dates: ["2026-07-01", "2026-07-02"],
    expected: { current: 2, longest: 2 },
  },
  {
    name: "2) [6/30, 7/1] -> current 2, longest 2 (today unchecked, runs through yesterday)",
    dates: ["2026-06-30", "2026-07-01"],
    expected: { current: 2, longest: 2 },
  },
  {
    name: "3) [6/29, 6/30] -> current 0, longest 2 (neither today nor yesterday)",
    dates: ["2026-06-29", "2026-06-30"],
    expected: { current: 0, longest: 2 },
  },
  {
    name: "4) [] -> current 0, longest 0",
    dates: [],
    expected: { current: 0, longest: 0 },
  },
  {
    name: "5) [6/1-6/10, 6/20-7/2] -> current 13, longest 13",
    dates: [...range("2026-06-01", "2026-06-10"), ...range("2026-06-20", "2026-07-02")],
    expected: { current: 13, longest: 13 },
  },
];

const EXTRA_CASES: Case[] = [
  {
    name: "extra) only today -> current 1, longest 1",
    dates: ["2026-07-02"],
    expected: { current: 1, longest: 1 },
  },
  {
    name: "extra) only yesterday -> current 1, longest 1",
    dates: ["2026-07-01"],
    expected: { current: 1, longest: 1 },
  },
  {
    name: "extra) unordered input, gap before today -> current 2, longest 3",
    dates: ["2026-07-02", "2026-06-10", "2026-06-12", "2026-06-11", "2026-07-01"],
    expected: { current: 2, longest: 3 },
  },
  {
    name: "extra) streak across a month boundary counts through (6/28-7/1)",
    dates: range("2026-06-28", "2026-07-01"),
    expected: { current: 4, longest: 4 },
  },
];

let failures = 0;
for (const testCase of [...SPEC_CASES, ...EXTRA_CASES]) {
  const { current, longest, total } = computeStreaks(testCase.dates, TODAY);
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
