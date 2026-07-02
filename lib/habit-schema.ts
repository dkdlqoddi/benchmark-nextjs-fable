import { z } from "zod";
import { isHabitColor } from "@/lib/habit-colors";
import { isTargetDaysMask } from "@/lib/target-days";

/** Server-side validation schema for the habit create/edit form. */
export const habitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(50, "Name must be at most 50 characters."),
  description: z
    .string()
    .trim()
    .max(200, "Description must be at most 200 characters.")
    .transform((value) => (value === "" ? null : value)),
  color: z.string().refine(isHabitColor, "Choose one of the preset colors."),
  targetDays: z.string().refine(isTargetDaysMask, "Pick at least one target day."),
});

/** Raw string values submitted from the habit form, echoed back on error. */
export type HabitFormValues = {
  name: string;
  description: string;
  color: string;
  /** 7-char 0/1 mask built from the target-day checkboxes (0 = Sunday). */
  targetDays: string;
};

/** State returned by habit form server actions for useActionState. */
export type HabitFormState = {
  status: "idle" | "error";
  fieldErrors?: Partial<Record<keyof HabitFormValues, string>>;
  formError?: string;
  values?: HabitFormValues;
};

type ParsedHabitForm =
  { success: true; data: z.output<typeof habitSchema> } | { success: false; state: HabitFormState };

/**
 * Parses habit form data with `habitSchema`; on failure returns a form state
 * carrying one message per invalid field plus the submitted values.
 */
export function parseHabitForm(formData: FormData): ParsedHabitForm {
  // The 7 target-day checkboxes (values "0".."6") fold into the mask string.
  const selectedDays = new Set(formData.getAll("targetDays").map(String));
  const values: HabitFormValues = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    color: String(formData.get("color") ?? ""),
    targetDays: Array.from({ length: 7 }, (_, day) =>
      selectedDays.has(String(day)) ? "1" : "0",
    ).join(""),
  };

  const result = habitSchema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: HabitFormState["fieldErrors"] = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof HabitFormValues;
    fieldErrors[field] ??= issue.message;
  }
  return { success: false, state: { status: "error", fieldErrors, values } };
}
