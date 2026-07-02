/**
 * The 8 preset colors a habit can use. Values are Tailwind 500-scale hexes;
 * they are stored on the habit and rendered via inline style (data-driven color).
 */
export const HABIT_COLORS = [
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Emerald", value: "#10b981" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
] as const;

/** Type of a single preset color entry. */
export type HabitColor = (typeof HABIT_COLORS)[number];

/** Returns true when `value` is one of the preset habit colors. */
export function isHabitColor(value: string): boolean {
  return HABIT_COLORS.some((color) => color.value === value);
}
