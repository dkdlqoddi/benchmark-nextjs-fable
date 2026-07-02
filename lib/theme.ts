/** User theme preference: explicit light/dark, or follow the OS setting. */
export type ThemePreference = "light" | "dark" | "system";

/** localStorage key the theme preference is stored under. */
export const THEME_STORAGE_KEY = "theme";

/**
 * Inline script that applies the stored theme before first paint (no flash of
 * the wrong theme). Rendered as the first child of <body> in the root layout;
 * it must stay self-contained because it runs before any bundle loads.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

/** True when the given preference means dark right now ("system" asks the OS). Client-only. */
export function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return preference === "dark";
}

/** Reads the stored preference, defaulting to "system". Client-only. */
export function readThemePreference(): ThemePreference {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

const listeners = new Set<() => void>();

/** Stores the preference, applies the `dark` class on <html>, notifies subscribers. Client-only. */
export function applyThemePreference(preference: ThemePreference): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  document.documentElement.classList.toggle("dark", resolveIsDark(preference));
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Subscribes to preference changes from this tab and (via the storage event)
 * other tabs, re-applying the html class for cross-tab changes. Client-only;
 * shaped for useSyncExternalStore.
 */
export function subscribeThemePreference(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      document.documentElement.classList.toggle("dark", resolveIsDark(readThemePreference()));
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Server snapshot for useSyncExternalStore: the preference is unknown during SSR. */
export function getServerThemePreference(): ThemePreference | null {
  return null;
}
