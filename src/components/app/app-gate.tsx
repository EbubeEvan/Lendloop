"use client";

import { useAuth } from "@clerk/nextjs";
import { AlertTriangleIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import { isAppConfigured } from "@/lib/env";
import { useViewerContext } from "@/providers/viewer-provider";

/**
 * Hard gate for every page in the (app) group. Renders the setup notice when
 * keys are missing, redirects signed-out visitors, and waits for the
 * Clerk → Convex user provisioning round-trip before children mount.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  if (!isAppConfigured) {
    return <SetupRequired />;
  }
  return <AppGateInner>{children}</AppGateInner>;
}

function AppGateInner({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { viewer, isLoading, error, retry } = useViewerContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Checking your session…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border bg-card p-8 text-center">
        <span className="grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangleIcon className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold">
          We couldn&apos;t load your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-5" variant="outline" onClick={() => void retry()}>
          <RefreshCwIcon data-icon="inline-start" className="size-4" /> Try again
        </Button>
      </div>
    );
  }

  if (isLoading || !viewer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Setting up your account…
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
