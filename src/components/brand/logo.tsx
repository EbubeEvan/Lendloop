import Link from "next/link";

import { cn } from "@/lib/utils";

export function LoopMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-5", className)}
    >
      <path d="M9.5 7H15a4.5 4.5 0 0 1 0 9h-1.2" />
      <path d="M14.5 17H9a4.5 4.5 0 0 1 0-9h1.2" />
      <circle cx="8.2" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Logo({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
      aria-label="LendLoop home"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform group-hover:-rotate-6">
        <LoopMark />
      </span>
      {!compact ? (
        <span className="font-display text-xl leading-none font-semibold tracking-tight">
          LendLoop
        </span>
      ) : null}
    </Link>
  );
}
