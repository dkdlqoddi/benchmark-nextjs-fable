import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

/** Generic bordered card container used as the base surface for content blocks. */
export function Card({ children, className }: CardProps) {
  const base =
    "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
  return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
