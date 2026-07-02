"use client";
// Client component: useActionState is required to surface per-field server
// validation errors and the pending state of the submit button.

import Link from "next/link";
import { useActionState } from "react";
import { HABIT_COLORS } from "@/lib/habit-colors";
import type { HabitFormState } from "@/lib/habit-schema";
import { EVERY_DAY, WEEKDAY_LABELS } from "@/lib/target-days";

type HabitFormProps = {
  /** Server action handling the submit (createHabit or a bound updateHabit). */
  action: (prevState: HabitFormState, formData: FormData) => Promise<HabitFormState>;
  /** Current values when editing; omit for the create form. */
  initialValues?: { name: string; description: string | null; color: string; targetDays: string };
  submitLabel: string;
};

const INITIAL_STATE: HabitFormState = { status: "idle" };

/**
 * Shared create/edit habit form: name, optional description, one of the
 * 8 preset colors, and the target days of the week (≥1 required). Server-side
 * validation errors render under each field. Native `required`/`maxLength`
 * attributes are intentionally omitted so the zod validation in the server
 * action stays the single source of truth.
 */
export function HabitForm({ action, initialValues, submitLabel }: HabitFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  // After a failed submit, prefer what the user typed over the stored values.
  const current = {
    name: state.values?.name ?? initialValues?.name ?? "",
    description: state.values?.description ?? initialValues?.description ?? "",
    color: state.values?.color || (initialValues?.color ?? HABIT_COLORS[0].value),
    targetDays: state.values?.targetDays ?? initialValues?.targetDays ?? EVERY_DAY,
  };

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="habit-name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="habit-name"
          name="name"
          type="text"
          defaultValue={current.name}
          aria-invalid={Boolean(state.fieldErrors?.name)}
          aria-describedby={state.fieldErrors?.name ? "habit-name-error" : undefined}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        />
        {state.fieldErrors?.name ? (
          <p id="habit-name-error" className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="habit-description" className="block text-sm font-medium">
          Description{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="habit-description"
          name="description"
          rows={3}
          defaultValue={current.description}
          aria-invalid={Boolean(state.fieldErrors?.description)}
          aria-describedby={state.fieldErrors?.description ? "habit-description-error" : undefined}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
        />
        {state.fieldErrors?.description ? (
          <p id="habit-description-error" className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.description}
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-3 pt-1">
          {HABIT_COLORS.map((color) => (
            <label key={color.value} className="cursor-pointer" title={color.label}>
              <input
                type="radio"
                name="color"
                value={color.value}
                defaultChecked={current.color === color.value}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="block h-8 w-8 rounded-full border border-zinc-300 transition-transform peer-checked:scale-110 peer-checked:ring-2 peer-checked:ring-zinc-950 peer-checked:ring-offset-2 peer-checked:ring-offset-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 dark:border-zinc-700 dark:peer-checked:ring-zinc-50 dark:peer-checked:ring-offset-zinc-950"
                style={{ backgroundColor: color.value }}
              />
              <span className="sr-only">{color.label}</span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.color ? (
          <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.color}</p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Target days</legend>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Days this habit is due. Off-day check-ins still count, but streaks only track target days.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {WEEKDAY_LABELS.map((label, day) => (
            <label key={label} className="cursor-pointer">
              <input
                type="checkbox"
                name="targetDays"
                value={day}
                defaultChecked={current.targetDays[day] === "1"}
                className="peer sr-only"
              />
              <span className="block rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors peer-checked:border-transparent peer-checked:bg-zinc-900 peer-checked:text-zinc-50 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:peer-checked:bg-zinc-100 dark:peer-checked:text-zinc-900">
                {label}
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.targetDays ? (
          <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.targetDays}</p>
        ) : null}
      </fieldset>

      {state.formError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.formError}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
