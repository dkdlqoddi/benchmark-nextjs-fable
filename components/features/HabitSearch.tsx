import Link from "next/link";
import { homeHref } from "@/lib/home-filters";

type HabitSearchProps = {
  /** Current normalized search query, if any. */
  query?: string;
  /** Currently selected tag — preserved across a search submit. */
  activeTag?: string;
};

/**
 * Server-rendered search box for the home page: a plain GET form writing the
 * ?q= param (search is a read, so no server action is involved). The active
 * tag filter rides along as a hidden input; "Clear" drops only the query.
 */
export function HabitSearch({ query, activeTag }: HabitSearchProps) {
  return (
    <form action="/" method="get" role="search" className="flex flex-wrap items-center gap-2">
      {activeTag ? <input type="hidden" name="tag" value={activeTag} /> : null}
      <label htmlFor="habit-search" className="sr-only">
        Search habits
      </label>
      <input
        id="habit-search"
        type="search"
        name="q"
        defaultValue={query ?? ""}
        placeholder="Search name, description, tags…"
        className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
      />
      <button
        type="submit"
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Search
      </button>
      {query ? (
        <Link
          href={homeHref({ tag: activeTag })}
          className="px-1 text-sm font-medium text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Clear
        </Link>
      ) : null}
    </form>
  );
}
