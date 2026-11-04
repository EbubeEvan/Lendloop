import { MapPinIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  AvailabilityBadge,
  ConditionBadge,
  ToneBadge,
  TrustedBadge,
} from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import {
  CATEGORY_META,
  CONDITION_META,
  type ToolCategory,
  type ToolCondition,
} from "@/lib/categories";
import { formatIsoDay } from "@/lib/format";
import type { Availability } from "@/lib/status";
import { cn } from "@/lib/utils";

export type ToolCardData = {
  _id: string;
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  description: string;
  owner: {
    _id: string;
    name: string;
    trustedLender: boolean;
    imageUrl?: string;
  };
  isMine: boolean;
  availability: Availability;
  nextAvailableDate?: string;
  pendingCount: number;
};

export function ToolCard({
  tool,
  actions,
  footer,
  compact = false,
  className,
}: {
  tool: ToolCardData;
  actions?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const category = CATEGORY_META[tool.category];
  const CategoryIcon = category.icon;
  const availabilityNote =
    tool.availability === "available"
      ? "Ready to borrow"
      : tool.nextAvailableDate
        ? `Free from ${formatIsoDay(tool.nextAvailableDate)}`
        : tool.availability === "on-loan"
          ? "Currently out on loan"
          : "Reserved for upcoming dates";

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-border/80 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <CategoryIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {category.label}
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg leading-snug font-semibold tracking-tight">
              {tool.name}
            </h3>
          </div>
        </div>
        <AvailabilityBadge availability={tool.availability} />
      </div>

      {!compact ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {tool.description}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ConditionBadge label={CONDITION_META[tool.condition].label} />
        {tool.owner.trustedLender ? <TrustedBadge /> : null}
        {tool.isMine ? (
          <ToneBadge tone="primary">Your listing</ToneBadge>
        ) : tool.pendingCount > 0 ? (
          <ToneBadge tone="amber">
            {tool.pendingCount} pending {tool.pendingCount === 1 ? "request" : "requests"}
          </ToneBadge>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar
            name={tool.owner.name}
            imageUrl={tool.owner.imageUrl}
            className="size-6 text-[10px]"
          />
          <span className="truncate text-xs text-muted-foreground">
            {tool.isMine ? "Shared by you" : tool.owner.name}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
          <MapPinIcon className="size-3" />
          {availabilityNote}
        </span>
      </div>

      {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
      {footer}
    </article>
  );
}

export function ToolCardSkeleton() {
  return (
    <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" aria-hidden>
      <div className="space-y-3 p-5">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
      </div>
    </div>
  );
}

export function BrowseSignInPrompt() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <UserRoundIcon className="size-5" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold">Sign in to see the details</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        The public board shows tool names and categories. Sign in for owners, notes, and dates.
      </p>
      <Button asChild className="mt-5">
        <Link href="/sign-in">Sign in</Link>
      </Button>
    </div>
  );
}
