import Link from "next/link";

type TagFilterProps = {
  /** Normalized names of all tags on the user's active habits, sorted. */
  tags: string[];
  /** The currently selected tag, if any. */
  activeTag?: string;
};

/**
 * Row of tag filter chips for the home page: "All" plus one chip per tag.
 * Chips are plain links carrying the ?tag= query, so filtering is fully
 * server-rendered.
 */
export function TagFilter({ tags, activeTag }: TagFilterProps) {
  const chips = [
    { label: "All", href: "/", active: activeTag === undefined },
    ...tags.map((name) => ({
      label: `#${name}`,
      href: `/?tag=${encodeURIComponent(name)}`,
      active: name === activeTag,
    })),
  ];

  return (
    <nav aria-label="Filter habits by tag" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.href}
          href={chip.href}
          aria-current={chip.active ? "page" : undefined}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            chip.active
              ? "border-transparent bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          {chip.label}
        </Link>
      ))}
    </nav>
  );
}
