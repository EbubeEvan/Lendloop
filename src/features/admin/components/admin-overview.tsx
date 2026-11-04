"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  InboxIcon,
  Loader2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, PageHeader, StatCard } from "@/components/page";
import { ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_META } from "@/lib/categories";
import { getErrorMessage } from "@/lib/errors";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

type ModerationTool = {
  _id: string;
  name: string;
  category: keyof typeof CATEGORY_META;
  owner: { name: string };
  pendingCount: number;
};

export function AdminOverview() {
  const overview = useQuery(api.features.admin.queries.overview);
  const tools = useQuery(api.features.tools.queries.listBrowse, {});
  const logs = useQuery(api.features.admin.queries.listAuditLogs);
  const removeTool = useMutation(api.features.tools.mutations.remove);

  const [removing, setRemoving] = useState<ModerationTool | null>(null);
  const [pending, setPending] = useState(false);

  const confirmRemove = async () => {
    if (!removing) {
      return;
    }
    try {
      setPending(true);
      const result = await removeTool({ toolId: removing._id as Id<"tools"> });
      toast.success("Listing removed", {
        description:
          result.declinedRequests > 0
            ? `${result.declinedRequests} pending request(s) were rejected and the owner was notified.`
            : `${removing.name} was removed from the board.`,
      });
      setRemoving(null);
    } catch (error) {
      toast.error("Could not remove listing", { description: getErrorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Neighborhood health at a glance"
        description="Moderate listings, keep an eye on loans, and make sure automated reminders are landing."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/automation">
              <ActivityIcon className="size-4" /> Automation log
            </Link>
          </Button>
        }
      />

      {overview === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" aria-hidden />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Neighbors" value={overview.users} icon={UsersIcon} />
          <StatCard label="Active tools" value={overview.activeTools} icon={WrenchIcon} />
          <StatCard label="Pending requests" value={overview.pendingRequests} icon={InboxIcon} />
          <StatCard label="Active loans" value={overview.activeLoans} icon={ArrowLeftRightIcon} />
          <StatCard
            label="Overdue loans"
            value={overview.overdueLoans}
            icon={AlertTriangleIcon}
            tone={overview.overdueLoans > 0 ? "danger" : "default"}
          />
          <StatCard
            label="Failed automations"
            value={overview.failedAutomations}
            icon={ShieldCheckIcon}
            tone={overview.failedAutomations > 0 ? "warning" : "default"}
          />
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Tool moderation</h2>
            <p className="text-xs text-muted-foreground">
              Admins can remove any listing. Active loans block removal.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/browse">Open full board</Link>
          </Button>
        </div>

        {tools === undefined ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" aria-hidden />
            ))}
          </div>
        ) : tools.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={WrenchIcon}
              title="No active listings"
              description="Once neighbors add tools, you'll be able to moderate them here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {tools.slice(0, 10).map((tool) => {
              const category = CATEGORY_META[tool.category];
              const Icon = category.icon;
              return (
                <li key={tool._id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tool.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {category.label} · {tool.isMine ? "yours" : tool.owner.name}
                    </p>
                  </div>
                  {tool.pendingCount > 0 ? (
                    <ToneBadge tone="amber">{tool.pendingCount} pending</ToneBadge>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setRemoving(tool)}
                  >
                    <Trash2Icon data-icon="inline-start" className="size-3.5" /> Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Recent activity</h2>
            <p className="text-xs text-muted-foreground">The last 100 audited actions.</p>
          </div>
        </div>
        {logs === undefined ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-8 animate-pulse rounded bg-muted" aria-hidden />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {logs.slice(0, 8).map((log) => (
              <li key={log._id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    log.action.includes("removed") ? "bg-rose-500" : "bg-emerald-500",
                  )}
                />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{log.actorName}</span>{" "}
                  <span className="text-muted-foreground">{log.action.replaceAll(".", " ")}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelative(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null);
          }
        }}
        title={`Remove ${removing?.name ?? "this listing"}?`}
        description="This removes another neighbor's listing and rejects any pending requests. Use it for stale or unsafe tools."
        confirmLabel="Remove listing"
        destructive
        pending={pending}
        onConfirm={() => void confirmRemove()}
      />

      {pending ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2Icon className="size-3 animate-spin" /> Removing listing…
        </p>
      ) : null}
    </div>
  );
}
