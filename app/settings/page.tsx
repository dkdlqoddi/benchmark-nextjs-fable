import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Preferences and habit management for your HabitLog account.",
};

/** Settings page placeholder — habit management and preferences land here in a later task. */
export default function SettingsPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Preferences and habit management are coming soon.
      </p>
    </section>
  );
}
