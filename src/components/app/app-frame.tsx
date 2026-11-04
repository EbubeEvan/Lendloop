"use client";

import { AppGate } from "@/components/app/app-gate";
import { AppShell } from "@/components/app/app-shell";
import { ViewerProvider } from "@/providers/viewer-provider";

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <ViewerProvider>
      <AppGate>
        <AppShell>{children}</AppShell>
      </AppGate>
    </ViewerProvider>
  );
}
