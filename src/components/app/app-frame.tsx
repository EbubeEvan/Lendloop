"use client";

import { AppGate } from "@/components/app/app-gate";
import { AppShell } from "@/components/app/app-shell";
import { SetupRequired } from "@/components/setup-required";
import { isAppConfigured } from "@/lib/env";
import { ViewerProvider } from "@/providers/viewer-provider";

export function AppFrame({ children }: { children: React.ReactNode }) {
  // ViewerProvider calls Clerk hooks, so it must not mount before we know
  // Clerk is configured. This also keeps the app buildable without keys.
  if (!isAppConfigured) {
    return <SetupRequired />;
  }

  return (
    <ViewerProvider>
      <AppGate>
        <AppShell>{children}</AppShell>
      </AppGate>
    </ViewerProvider>
  );
}
