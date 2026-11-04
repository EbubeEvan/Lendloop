"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ActivityIcon,
  BellRingIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  MailIcon,
  XCircleIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader, StatCard } from "@/components/page";
import { ToneBadge } from "@/components/status-badge";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  "request.created": "Request created",
  "request.approved": "Request approved",
  "request.declined": "Request rejected",
  "request.cancelled": "Request cancelled",
  "request.returned": "Request returned",
  "reminder.sent": "Overdue reminder",
  "workflow.failed": "Workflow failure",
};

const FILTERS = [
  { value: "all", label: "All events" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export function AdminAutomation() {
  const events = useQuery(api.features.automation.queries.recent);
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const pool = events ?? [];
    return {
      sent: pool.filter((event) => event.status === "sent").length,
      failed: pool.filter((event) => event.status === "failed").length,
      reminders: pool.filter((event) => event.type === "reminder.sent").length,
    };
  }, [events]);

  const visible = useMemo(() => {
    if (!events) {
      return [];
    }
    if (filter === "all") {
      return events;
    }
    return events.filter((event) => event.status === filter);
  }, [events, filter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Automation health"
        description="Every signed hand-off between Convex and n8n — request notifications, reminders, and failures."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Delivered" value={counts.sent} icon={CheckCircle2Icon} />
        <StatCard
          label="Failed"
          value={counts.failed}
          icon={XCircleIcon}
          tone={counts.failed > 0 ? "danger" : "default"}
        />
        <StatCard label="Reminders sent" value={counts.reminders} icon={BellRingIcon} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <KeyRoundIcon className="size-4" />
            </span>
            <h2 className="text-sm font-semibold">Signed both ways</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Outgoing events use <code className="font-mono">CONVEX_TO_N8N_SECRET</code>. n8n calls
            back with <code className="font-mono">N8N_TO_CONVEX_SECRET</code>. Canonical payloads
            are timestamped and replay-protected.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <MailIcon className="size-4" />
            </span>
            <h2 className="text-sm font-semibold">Local delivery</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Run <code className="font-mono">pnpm n8n:up</code> and import the workflows. Mailpit
            catches every message at <code className="font-mono">localhost:8025</code>.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === item.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {events === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" aria-hidden />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No automation events yet"
          description="Create a borrow request to see the signed notification flow appear here."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {visible.map((event) => {
            const failed = event.status === "failed";
            return (
              <li key={event._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    failed
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200",
                  )}
                >
                  {failed ? (
                    <XCircleIcon className="size-4" />
                  ) : (
                    <CheckCircle2Icon className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {TYPE_LABEL[event.type] ?? event.type}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {event.error ?? event.detail ?? `${event.channel} · ${event.status}`}
                  </p>
                </div>
                <ToneBadge tone={failed ? "rose" : "emerald"} dot>
                  {event.status}
                </ToneBadge>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelative(event.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Only the 100 most recent events are shown. Reminder idempotency keys are scoped to one UTC
        day per loan.
      </p>
    </div>
  );
}
