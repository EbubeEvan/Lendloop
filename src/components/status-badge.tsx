import { BadgeCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  type Availability,
  AVAILABILITY_META,
  REQUEST_STATUS_META,
  type RequestStatus,
} from "@/lib/status";
import { cn } from "@/lib/utils";

type Tone = "emerald" | "amber" | "rose" | "stone" | "sky" | "primary";

const TONE_CLASSES: Record<Tone, string> = {
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100",
  rose: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-100",
  stone:
    "border-stone-200 bg-stone-100 text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-200",
  sky: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-100",
  primary: "border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15",
};

export function ToneBadge({
  tone,
  children,
  icon,
  dot = false,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  icon?: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 border", TONE_CLASSES[tone], className)}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {icon}
      {children}
    </Badge>
  );
}

export function RequestStatusBadge({
  status,
  className,
}: {
  status: RequestStatus;
  className?: string;
}) {
  const meta = REQUEST_STATUS_META[status];
  return (
    <ToneBadge tone={meta.tone} dot className={className}>
      {meta.label}
    </ToneBadge>
  );
}

export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  const meta = AVAILABILITY_META[availability];
  return (
    <ToneBadge tone={meta.tone} dot className={className}>
      {meta.label}
    </ToneBadge>
  );
}

export function ConditionBadge({ label, className }: { label: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-border/70 bg-background/70 text-muted-foreground", className)}
    >
      {label}
    </Badge>
  );
}

export function TrustedBadge({ className }: { className?: string }) {
  return (
    <ToneBadge
      tone="primary"
      icon={<BadgeCheck className="size-3.5" />}
      className={cn("px-1.5", className)}
    >
      Trusted
    </ToneBadge>
  );
}
