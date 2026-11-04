"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AutomationTimeline } from "@/components/automation-timeline";
import { EmptyState, PageHeader, StatCard } from "@/components/page";
import { RequestActions } from "@/components/request-actions";
import { RequestCard, RequestCardSkeleton } from "@/components/request-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "overdue" | "returned";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All loans" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "returned", label: "Returned" },
];

export function LoansView() {
  const loans = useQuery(api.features.loans.queries.listMine);
  const [filter, setFilter] = useState<Filter>("all");

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
        eyebrow="Loans"
        title="Everything currently out and back"
        description="Active loans, overdue returns, and the full history — for tools you lend and tools you borrow."
        actions={
          <Button asChild variant="outline">
            <Link href="/browse">
              <ArrowLeftRightIcon className="size-4" /> Browse tools
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Active" value={counts.active} icon={CalendarClockIcon} />
        <StatCard
          label="Overdue"
          value={counts.overdue}
          icon={AlertTriangleIcon}
          tone={counts.overdue > 0 ? "danger" : "default"}
          hint="Reminders run daily via n8n"
        />
        <StatCard label="Returned" value={counts.returned} icon={CheckCircle2Icon} />
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
          title={filter === "overdue" ? "Nothing overdue" : "No loans in this view"}
          description={
            filter === "overdue"
              ? "Every tool is back on time. The reminder workflow has nothing to chase today."
              : "Approved requests become loans automatically. Once you approve or borrow a tool, it shows up here."
          }
          action={
            <Button asChild>
              <Link href="/browse">Find something to borrow</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((loan) => (
            <RequestCard
              key={loan._id}
              request={loan}
              actions={<RequestActions request={loan} compact />}
              footer={
                <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {loan.viewerRole === "borrower" ? "You are borrowing" : "You are lending"}
                  </p>
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
