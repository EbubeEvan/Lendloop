"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeftRightIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { AutomationTimeline } from "@/components/automation-timeline";
import { EmptyState, PageHeader, StatCard } from "@/components/page";
import { RequestActions } from "@/components/request-actions";
import { RequestCard, RequestCardSkeleton } from "@/components/request-card";
import { cn } from "@/lib/utils";

type Filter = "active" | "overdue" | "returned" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "returned", label: "Returned" },
  { value: "all", label: "Everything" },
];

export function AdminLoans() {
  const loans = useQuery(api.features.admin.queries.listLoans);
  const [filter, setFilter] = useState<Filter>("active");

  const counts = useMemo(() => {
    const pool = loans ?? [];
    return {
      active: pool.filter((loan) => loan.status === "approved").length,
      overdue: pool.filter((loan) => loan.isOverdue).length,
      returned: pool.filter((loan) => loan.status === "returned").length,
    };
  }, [loans]);

  const visible = useMemo(() => {
    if (!loans) {
      return [];
    }
    if (filter === "active") {
      return loans.filter((loan) => loan.status === "approved");
    }
    if (filter === "overdue") {
      return loans.filter((loan) => loan.isOverdue);
    }
    if (filter === "returned") {
      return loans.filter((loan) => loan.status === "returned");
    }
    return loans;
  }, [loans, filter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Every loan in the neighborhood"
        description="Read-only oversight with the ability to close a loan if a neighbor is unavailable."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Active" value={counts.active} />
        <StatCard
          label="Overdue"
          value={counts.overdue}
          tone={counts.overdue > 0 ? "danger" : "default"}
        />
        <StatCard label="Returned" value={counts.returned} />
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

      {loans === undefined ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <RequestCardSkeleton key={index} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRightIcon}
          title="No loans in this view"
          description="Approved requests and returned tools will show up here across every neighbor."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((loan) => (
            <RequestCard
              key={loan._id}
              request={loan}
              actions={<RequestActions request={loan} compact />}
              footer={
                <div className="mt-3 border-t border-border/70 pt-3">
                  <AutomationTimeline requestId={loan._id} />
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
