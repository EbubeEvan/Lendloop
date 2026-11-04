"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { LayoutGridIcon, PlusIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader } from "@/components/page";
import { ToolCard, type ToolCardData, ToolCardSkeleton } from "@/components/tool-card";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, TOOL_CATEGORIES, type ToolCategory } from "@/lib/categories";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import { RequestDialog } from "./request-dialog";

const FILTERS: { value: ToolCategory | "all"; label: string }[] = [
  { value: "all", label: "All tools" },
  ...TOOL_CATEGORIES.map((category) => ({
    value: category,
    label: CATEGORY_META[category].label,
  })),
];

export function BrowseView() {
  const categoryFilter = useUiStore((state) => state.categoryFilter);
  const setCategoryFilter = useUiStore((state) => state.setCategoryFilter);
  const search = useUiStore((state) => state.search);
  const setSearch = useUiStore((state) => state.setSearch);
  const onlyAvailable = useUiStore((state) => state.onlyAvailable);
  const setOnlyAvailable = useUiStore((state) => state.setOnlyAvailable);
  const resetFilters = useUiStore((state) => state.resetBrowseFilters);

  const tools = useQuery(
    api.features.tools.queries.listBrowse,
    categoryFilter === "all" ? {} : { category: categoryFilter as ToolCategory },
  );
  const [requestTool, setRequestTool] = useState<ToolCardData | null>(null);

  const visible = useMemo(() => {
    if (!tools) {
      return [];
    }
    const term = search.trim().toLowerCase();
    return tools.filter((tool) => {
      if (onlyAvailable && tool.availability !== "available") {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        tool.name.toLowerCase().includes(term) ||
        tool.description.toLowerCase().includes(term) ||
        tool.owner.name.toLowerCase().includes(term)
      );
    });
  }, [tools, search, onlyAvailable]);

  const hasFilters = categoryFilter !== "all" || search.trim().length > 0 || onlyAvailable;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Browse"
        title="What's on the block?"
        description="Every tool neighbors have listed. Request a date range and the owner handles the rest."
        actions={
          <Button asChild>
            <Link href="/listings">
              <PlusIcon className="size-4" /> List a tool
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tools, descriptions, or neighbors…"
            aria-label="Search tools"
            className="h-10 w-full rounded-lg border border-input bg-background pr-9 pl-9 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setCategoryFilter(filter.value)}
                aria-pressed={categoryFilter === filter.value}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  categoryFilter === filter.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={onlyAvailable ? "default" : "outline"}
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              aria-pressed={onlyAvailable}
            >
              <SlidersHorizontalIcon data-icon="inline-start" className="size-3.5" />
              Available now
            </Button>
            {hasFilters ? (
              <Button type="button" size="sm" variant="ghost" onClick={resetFilters}>
                Reset
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {tools === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ToolCardSkeleton key={index} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LayoutGridIcon}
          title={hasFilters ? "No tools match those filters" : "The board is empty"}
          description={
            hasFilters
              ? "Try a different category or clear your search. Neighbors add tools all the time."
              : "Be the first to share something. A drill, a ladder, a tent — someone nearby needs it."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/listings">
                  <PlusIcon className="size-4" /> List your first tool
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {visible.length} {pluralize(visible.length, "tool")}
            {categoryFilter !== "all" ? ` in ${CATEGORY_META[categoryFilter].label}` : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((tool) => (
              <ToolCard
                key={tool._id}
                tool={tool}
                actions={
                  tool.isMine ? (
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href="/listings">Manage listing</Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setRequestTool(tool)}
                      disabled={tool.availability === "on-loan"}
                    >
                      {tool.availability === "on-loan" ? "Currently on loan" : "Request to borrow"}
                    </Button>
                  )
                }
              />
            ))}
          </div>
        </>
      )}

      {requestTool ? (
        <RequestDialog
          tool={requestTool}
          open={Boolean(requestTool)}
          onOpenChange={(open) => {
            if (!open) {
              setRequestTool(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
