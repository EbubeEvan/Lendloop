"use client";

import { notFound } from "next/navigation";

import { useViewerContext } from "@/providers/viewer-provider";

/**
 * Second line of defense behind the proxy check in `src/proxy.ts`, which
 * already returns a 404 to non-admins before rendering. If a non-admin still
 * reaches an admin screen, show the same 404 so the page's existence is not
 * revealed. Admin data is protected independently by `requireAdmin` in Convex.
 */
export function AdminGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { viewer } = useViewerContext();

  if (viewer?.role !== "admin") {
    notFound();
  }

  return <>{children}</>;
}
