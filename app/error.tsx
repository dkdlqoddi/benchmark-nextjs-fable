"use client";
// Client component: error boundaries must be Client Components so React can
// catch render/data errors below the layout and re-render via unstable_retry.

import Link from "next/link";
import { useEffect } from "react";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the failed segment (Next 16 error boundary API). */
  unstable_retry: () => void;
};

/**
 * Route-level error fallback for everything below the root layout: keeps the
 * top navigation usable, explains the failure without leaking details (the
 * server already redacts messages to a digest in production), and offers a
 * retry plus a way home.
 */
export default function ErrorBoundary({ error, unstable_retry }: ErrorBoundaryProps) {
  useEffect(() => {
    // Surface the error in the browser console; the digest links it to the
    // corresponding server-side log line.
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-md space-y-6 py-12 text-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          An unexpected error occurred while loading this page. It may be temporary — trying again
          often fixes it.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
            Error reference: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}
