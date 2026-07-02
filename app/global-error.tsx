"use client";
// Client component: error boundaries must be Client Components; this one
// replaces the root layout entirely, so it renders its own <html>/<body>.

import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the whole tree (Next 16 error boundary API). */
  unstable_retry: () => void;
};

/**
 * Last-resort error page for failures in the root layout itself (e.g. a
 * misconfigured deployment). Replaces the layout, so it ships its own
 * document shell, global styles, and pre-paint theme script; metadata exports
 * are unsupported here, hence the React <title> tag.
 */
export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  return (
    // suppressHydrationWarning: the theme init script mutates the html class
    // before React hydrates, same as the root layout.
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <title>Something went wrong — HabitLog</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              HabitLog hit an unexpected error and could not render this page.
            </p>
            {error.digest ? (
              <p className="mt-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                Error reference: {error.digest}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
