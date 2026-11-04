"use client";

import { ShieldAlertIcon } from "lucide-react";

import { useViewerContext } from "@/providers/viewer-provider";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { viewer } = useViewerContext();

  if (!viewer || viewer.role !== "admin") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border bg-card p-8 text-center">
        <span className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
          <ShieldAlertIcon className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold">Administrators only</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ask a neighbor with admin access to add your email to the server-side allowlist.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
