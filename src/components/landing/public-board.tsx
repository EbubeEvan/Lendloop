"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRightIcon, Loader2Icon, LockIcon, PackageSearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { LandingAuthActions } from "@/components/landing/landing-actions";
import { ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, TOOL_CATEGORIES, type ToolCategory } from "@/lib/categories";
import { isAppConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

type PublicTool = {
  _id: string;
  name: string;
  category: ToolCategory;
};

const PREVIEW_TOOLS: PublicTool[] = [
  { _id: "preview-1", name: "DeWalt 20V cordless drill", category: "power-tools" },
  { _id: "preview-2", name: "Extension ladder (16 ft)", category: "hand-tools" },
  { _id: "preview-3", name: "Cast iron skillet", category: "kitchen" },
  { _id: "preview-4", name: "Two-person camping tent", category: "camping" },
  { _id: "preview-5", name: "Cordless leaf blower", category: "garden" },
  { _id: "preview-6", name: "Garden tiller", category: "garden" },
  { _id: "preview-7", name: "Stand mixer", category: "kitchen" },
  { _id: "preview-8", name: "Random orbit sander", category: "power-tools" },
];

type Filter = ToolCategory | "all";

function ToolChip({ tool }: { tool: PublicTool }) {
  const meta = CATEGORY_META[tool.category];
  const Icon = meta.icon;

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{tool.name}</span>
        <span className="block text-xs text-muted-foreground">{meta.label}</span>
      </span>
    </li>
  );
}

function BoardGrid({ tools, isPreview }: { tools: PublicTool[]; isPreview: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const map = new Map<Filter, number>();
    map.set("all", tools.length);
    for (const tool of tools) {
      map.set(tool.category, (map.get(tool.category) ?? 0) + 1);
    }
    return map;
  }, [tools]);

  const visible = useMemo(
    () => (filter === "all" ? tools : tools.filter((tool) => tool.category === filter)),
    [filter, tools],
  );

  return (
    <div className="rounded-3xl border border-border bg-card/80 p-4 shadow-xl shadow-black/[0.03] backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <p className="text-sm font-medium">
            {tools.length} tools on the block
            {isPreview ? <span className="text-muted-foreground"> · sample data</span> : null}
          </p>
        </div>
        {isPreview ? (
          <ToneBadge tone="stone" icon={<LockIcon className="size-3" />}>
            Preview
          </ToneBadge>
        ) : null}
      </div>

      <div className="mt-4 no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            filter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          All ({counts.get("all") ?? 0})
        </button>
        {TOOL_CATEGORIES.map((category) => {
          const meta = CATEGORY_META[category];
          const count = counts.get(category) ?? 0;
          const Icon = meta.icon;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setFilter(category)}
              aria-pressed={filter === category}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === category
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {meta.shortLabel}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {visible.map((tool) => (
            <ToolChip key={tool._id} tool={tool} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <PackageSearchIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-medium">Nothing in this category yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Be the first neighbor to list a tool here.
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          The public board lists tool names and categories only. Descriptions, owners, and dates
          stay behind sign-in.
        </p>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href={isPreview ? "/sign-in" : "/browse"}>
            Open the full board
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PublicBoardLive() {
  const tools = useQuery(api.features.tools.queries.listPublic);

  if (tools === undefined) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-3xl border border-border bg-card/80">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Loading the board…
        </span>
      </div>
    );
  }

  return <BoardGrid tools={tools as PublicTool[]} isPreview={false} />;
}

export function PublicBoard() {
  return (
    <section
      id="board"
      className="scroll-mt-24 border-b border-border/60 bg-muted/20 py-16 sm:py-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              The community board
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              A shelf of things your block already owns
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Open to everyone, no account needed to look. Tool name and category only — the useful
              part without anyone&apos;s personal details.
            </p>
          </div>
          <LandingAuthActions variant="board" className="shrink-0" />
        </div>

        {isAppConfigured ? <PublicBoardLive /> : <BoardGrid tools={PREVIEW_TOOLS} isPreview />}
      </div>
    </section>
  );
}
