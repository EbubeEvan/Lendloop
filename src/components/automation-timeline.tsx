"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { BellRingIcon, CheckCircle2Icon, MailIcon, XCircleIcon } from "lucide-react";

import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const EVENT_LABEL: Record<string, string> = {
  "request.created": "Request notification",
  "request.approved": "Approval notification",
  "request.declined": "Rejection notification",
  "request.cancelled": "Cancellation notification",
  "request.returned": "Return notification",
  "reminder.sent": "Overdue reminder",
  "workflow.failed": "Workflow failure",
};

export function AutomationTimeline({
  requestId,
  className,
}: {
  requestId: Id<"borrowRequests">;
  className?: string;
}) {
  const events = useQuery(api.features.automation.queries.recentForRequest, { requestId });

  if (events === undefined) {
    return <div className={cn("h-10 animate-pulse rounded-lg bg-muted", className)} aria-hidden />;
  }

  if (events.length === 0) {
    return (
      <p className={cn("text-[11px] text-muted-foreground", className)}>
        No automation events yet for this request.
      </p>
    );
  }

  return (
    <ol className={cn("space-y-2", className)}>
      {events.slice(0, 4).map((event) => {
        const failed = event.status === "failed";
        const Icon = failed
          ? XCircleIcon
          : event.type === "reminder.sent"
            ? BellRingIcon
            : CheckCircle2Icon;
        return (
          <li key={event._id} className="flex items-start gap-2 text-[11px]">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                failed
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200",
              )}
            >
              <Icon className="size-3" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {EVENT_LABEL[event.type] ?? event.type}
                <span className="font-normal text-muted-foreground">
                  · {formatRelative(event.createdAt)}
                </span>
              </span>
              <span className="block truncate text-muted-foreground">
                {event.error ?? event.detail ?? `${event.channel} · ${event.status}`}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function MailHint() {
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <MailIcon className="size-3" />
      Emails are delivered by the local n8n + Mailpit stack.
    </p>
  );
}
