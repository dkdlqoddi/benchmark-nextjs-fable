"use client";
// Client component: useActionState is required to surface per-field server
// validation errors and the pending state of the submit button.

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/lib/auth-schema";

type AuthFormProps = {
  /** Server action handling the submit (login or signup). */
  action: (prevState: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  /** Button label while the submit is pending, e.g. "Logging in…". */
  pendingLabel: string;
  /** Password-manager hint: existing password (login) vs new one (signup). */
  passwordAutoComplete: "current-password" | "new-password";
  /** Optional helper line under the password field (e.g. the length rule). */
  passwordHint?: string;
  /** Link to the opposite auth page rendered under the form. */
  footer: { text: string; linkLabel: string; href: string };
};

const INITIAL_STATE: AuthFormState = { status: "idle" };

const INPUT_CLASSES =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700";

/**
 * Shared login/signup form: email + password with per-field server errors.
 * `noValidate` disables native browser validation so the zod schemas in the
 * server actions stay the single source of truth (same policy as HabitForm).
 */
export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  passwordAutoComplete,
  passwordHint,
  footer,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} noValidate className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="auth-email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "auth-email-error" : undefined}
          className={INPUT_CLASSES}
        />
        {state.fieldErrors?.email ? (
          <p id="auth-email-error" className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="auth-password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={passwordAutoComplete}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "auth-password-error" : undefined}
          className={INPUT_CLASSES}
        />
        {state.fieldErrors?.password ? (
          <p id="auth-password-error" className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.password}
          </p>
        ) : passwordHint ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{passwordHint}</p>
        ) : null}
      </div>

      {state.formError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.formError}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? pendingLabel : submitLabel}
      </button>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        {footer.text}{" "}
        <Link
          href={footer.href}
          className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
        >
          {footer.linkLabel}
        </Link>
      </p>
    </form>
  );
}
