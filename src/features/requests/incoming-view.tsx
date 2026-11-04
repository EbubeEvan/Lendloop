"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { InboxIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AutomationTimeline } from "@/components/automation-timeline";
import { EmptyState, PageHeader, StatCard } from "@/components/page";
import { RequestActions } from "@/components/request-actions";
import { RequestCard, RequestCardSkeleton } from "@/components/request-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "pending", label: "Needs a response" },
  { value: "approved", label: "Active loans" },
  { value: "all", label: "Everything" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export function IncomingView() {
  const requests = useQuery(api.features.requests.queries.listIncoming);
  const [filter, setFilter] = useState<Filter>("pending");

  const visible = useMemo(() => {
    if (!requests) {
      return [];
    }
    if (filter === "all") {
      return requests;
    }
    return requests.filter((request) => request.status === filter);
  }, [requests, filter]);

  const pendingCount = requests?.filter((request) => request.status === "pending").length ?? 0;
  const activeCount = requests?.filter((request) => request.status === "approved").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Incoming requests"
        title="Neighbors asking for your tools"
        description="Approve the ones that work for you. Approving a request automatically declines overlapping ones."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Needs a response"
          value={pendingCount}
          icon={InboxIcon}
          tone={pendingCount > 0 ? "warning" : "default"}
        />
        <StatCard label="Active loans" value={activeCount} />
        <StatCard label="Total requests" value={requests?.length ?? 0} />
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

      {requests === undefined ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <RequestCardSkeleton key={index} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title={filter === "pending" ? "You're all caught up" : "Nothing here yet"}
          description={
            filter === "pending"
              ? "No requests are waiting on you. When someone asks to borrow a tool, it lands here."
              : "Requests from neighbors will appear here as soon as they come in."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/listings">Review my listings</Link>
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
