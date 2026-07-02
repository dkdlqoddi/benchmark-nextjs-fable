import Link from "next/link";
import { logout } from "@/actions/auth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { auth } from "@/lib/auth";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Stats", href: "/stats" },
  { label: "Settings", href: "/settings" },
] as const;

/**
 * Top navigation bar: logo, and — when signed in — the main menu, the account
 * email, and a Sign out button (a form bound to the logout server action).
 * Signed out (on /login and /signup) it shows only logo + theme toggle.
 */
export async function TopNav() {
  const session = await auth();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          HabitLog
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          {session?.user ? (
            <>
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
              <div className="flex items-center gap-2">
                <span className="hidden max-w-40 truncate text-xs text-zinc-500 sm:inline dark:text-zinc-400">
                  {session.user.email}
                </span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
