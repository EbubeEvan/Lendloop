"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeftRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AutomationTimeline } from "@/components/automation-timeline";
import { EmptyState, PageHeader } from "@/components/page";
import { RequestActions } from "@/components/request-actions";
import { RequestCard, RequestCardSkeleton } from "@/components/request-card";
import { Button } from "@/components/ui/button";
import type { RequestStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

const FILTERS: { value: "all" | "active" | "history"; label: string }[] = [
  { value: "all", label: "All requests" },
  { value: "active", label: "Awaiting or active" },
  { value: "history", label: "History" },
];

const ACTIVE_STATUSES: RequestStatus[] = ["pending", "approved"];

export function RequestsView() {
  const requests = useQuery(api.features.requests.queries.listMine);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");

  const visible = useMemo(() => {
    if (!requests) {
      return [];
    }
    if (filter === "active") {
      return requests.filter((request) => ACTIVE_STATUSES.includes(request.status));
    }
    if (filter === "history") {
      return requests.filter((request) => !ACTIVE_STATUSES.includes(request.status));
    }
    return requests;
  }, [requests, filter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="My requests"
        title="Tools you've asked to borrow"
        description="Track what you're waiting on, cancel a request, or close the loop when a tool goes back."
        actions={
          <Button asChild variant="outline">
            <Link href="/browse">
              <PlusIcon className="size-4" /> Find a tool
            </Link>
          </Button>
        }
      />

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
            {requests ? (
              <span className="ml-1.5 tabular-nums opacity-70">
                {item.value === "all"
                  ? requests.length
                  : item.value === "active"
                    ? requests.filter((request) => ACTIVE_STATUSES.includes(request.status)).length
                    : requests.filter((request) => !ACTIVE_STATUSES.includes(request.status))
                        .length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {requests === undefined ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <RequestCardSkeleton key={index} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRightIcon}
          title={filter === "history" ? "No past requests yet" : "No requests here"}
          description={
            filter === "history"
              ? "Once a request is rejected, cancelled, or returned, it will show up here."
              : "Browse the board and ask a neighbor to borrow something. Most people say yes."
          }
          action={
            <Button asChild>
              <Link href="/browse">Browse tools</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((request) => (
            <RequestCard
              key={request._id}
              request={request}
              actions={<RequestActions request={request} compact />}
              footer={
                <div className="mt-3 border-t border-border/70 pt-3">
                  <AutomationTimeline requestId={request._id} />
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
