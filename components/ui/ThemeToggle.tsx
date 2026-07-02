"use client";
// Client component: the theme choice lives in localStorage and toggles a class
// on <html>, both of which only exist in the browser.

import { useEffect, useSyncExternalStore } from "react";
import {
  applyThemePreference,
  getServerThemePreference,
  readThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

/**
 * Three-state theme switcher (light / dark / follow the OS). The preference is
 * read via useSyncExternalStore, so it is null during SSR (no option
 * highlighted) and syncs across tabs.
 */
export function ThemeToggle() {
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    readThemePreference,
    getServerThemePreference,
  );

  // While following the system, track OS preference changes live.
  useEffect(() => {
    if (preference !== "system") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => document.documentElement.classList.toggle("dark", media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => applyThemePreference(option.value)}
          aria-pressed={preference === option.value}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            preference === option.value
              ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
