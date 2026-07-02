import Link from "next/link";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Stats", href: "/stats" },
  { label: "Settings", href: "/settings" },
] as const;

/** Top navigation bar with the HabitLog logo and the main menu (Home / Stats / Settings). */
export function TopNav() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          HabitLog
        </Link>
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-4 text-sm font-medium sm:gap-6">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
