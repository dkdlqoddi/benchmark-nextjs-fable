import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
};

/**
 * Custom 404 for both unmatched URLs and notFound() calls (e.g. a habit id
 * that doesn't exist or belongs to another account — the two are deliberately
 * indistinguishable). Rendered inside the root layout, so the top navigation
 * stays available.
 */
export default function NotFound() {
  return (
    <section className="mx-auto max-w-md space-y-6 py-12 text-center">
      <div>
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">404</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This page doesn&apos;t exist — the link may be wrong, or the habit it pointed to may have
          been deleted.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Back to home
        </Link>
        <Link
          href="/habits/archived"
          className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          View archived habits
        </Link>
      </div>
    </section>
  );
}
