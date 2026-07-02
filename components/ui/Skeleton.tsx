type SkeletonProps = {
  /** Tailwind sizing/spacing classes for this placeholder block. */
  className?: string;
};

/** Pulsing placeholder block for loading states (decorative, hidden from AT). */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className ?? ""}`}
    />
  );
}

/**
 * Screen-reader announcement wrapper every loading.tsx uses: children are the
 * visual skeleton; assistive technology hears just "Loading page".
 */
export function LoadingRegion({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading page</span>
      {children}
    </div>
  );
}
