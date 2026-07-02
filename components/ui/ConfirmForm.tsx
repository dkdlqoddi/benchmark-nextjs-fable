"use client";
// Client component: intercepts submit to show a confirm dialog before the
// destructive server action runs.

import type { ReactNode } from "react";

type ConfirmFormProps = {
  /** Server action to run once the user confirms (typically a bound action). */
  action: () => Promise<void>;
  /** Message shown in the native confirm dialog. */
  message: string;
  children: ReactNode;
};

/** Form wrapper that asks for confirmation before invoking its server action. */
export function ConfirmForm({ action, message, children }: ConfirmFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
