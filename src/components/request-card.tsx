import { ArrowRightIcon, CalendarIcon, ClockIcon, StickyNoteIcon } from "lucide-react";
import type { ReactNode } from "react";

import { RequestStatusBadge, ToneBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { CATEGORY_META, type ToolCategory, type ToolCondition } from "@/lib/categories";
import { formatIsoRange, formatRelative } from "@/lib/format";
import type { RequestStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export type RequestCardData = {
  _id: string;
  tool: {
    _id: string;
    name: string;
    category: ToolCategory;
    condition: ToolCondition;
    description: string;
    isRemoved: boolean;
  };
  owner: { _id: string; name: string; trustedLender: boolean; imageUrl?: string };
  borrower: { _id: string; name: string; trustedLender: boolean; imageUrl?: string };
  startDate: string;
  endDate: string;
  note?: string;
  status: RequestStatus;
  viewerRole: "borrower" | "lender" | "admin";
  isOverdue: boolean;
  canApprove: boolean;
  canDecline: boolean;
  canCancel: boolean;
  canReturn: boolean;
  reminderCount: number;
  lastRemindedOn?: string;
  createdAt: number;
  respondedAt?: number;
  returnedAt?: number;
};

export function RequestCard({
  request,
  actions,
  footer,
  showToolLink = false,
  className,
}: {
  request: RequestCardData;
  actions?: ReactNode;
  footer?: ReactNode;
  showToolLink?: boolean;
  className?: string;
}) {
  const category = CATEGORY_META[request.tool.category];
  const CategoryIcon = category.icon;
  const counterpart = request.viewerRole === "borrower" ? request.owner : request.borrower;
  const counterpartLabel =
    request.viewerRole === "borrower"
      ? "Lent by"
      : request.viewerRole === "lender"
        ? "Requested by"
        : `From ${request.borrower.name} · owned by ${request.owner.name}`;

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5",
        request.isOverdue && "border-rose-200 dark:border-rose-400/30",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary",
              request.tool.isRemoved && "bg-muted text-muted-foreground",
            )}
          >
            <CategoryIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {category.label}
              {request.tool.isRemoved ? " · removed" : ""}
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg leading-snug font-semibold tracking-tight">
              {showToolLink ? request.tool.name : request.tool.name}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {request.isOverdue ? <ToneBadge tone="rose">Overdue</ToneBadge> : null}
          <RequestStatusBadge status={request.status} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <span className="flex items-center gap-2">
          <CalendarIcon className="size-4 shrink-0" />
          {formatIsoRange(request.startDate, request.endDate)}
        </span>
        <span className="flex items-center gap-2">
          <ClockIcon className="size-4 shrink-0" />
          Requested {formatRelative(request.createdAt)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-3">
        <UserAvatar
          name={counterpart.name}
          imageUrl={counterpart.imageUrl}
          className="size-6 text-[10px]"
        />
        <span className="truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{counterpartLabel}</span>
          {request.viewerRole !== "admin" ? ` · ${counterpart.name}` : ""}
        </span>
        {request.reminderCount > 0 ? (
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
            {request.reminderCount} reminder{request.reminderCount === 1 ? "" : "s"} sent
          </span>
        ) : null}
      </div>

      {request.note ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
          <StickyNoteIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{request.note}</p>
        </div>
      ) : null}

      {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
      {footer}

      {request.status === "approved" && request.returnedAt === undefined ? (
        <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <ArrowRightIcon className="size-3" />
          Loan open until marked returned
        </p>
      ) : null}
    </article>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-2xl border border-border bg-card" aria-hidden />
  );
}
