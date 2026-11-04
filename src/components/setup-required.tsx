import { ArrowRightIcon, Settings2Icon } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { isClerkConfigured, isConvexConfigured } from "@/lib/env";

export function SetupRequired({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm dark:border-amber-400/20 dark:bg-amber-400/10">
        <p className="font-medium text-amber-900 dark:text-amber-100">Demo data needs Convex.</p>
        <p className="mt-1 text-amber-800 dark:text-amber-100/70">
          Add <code className="font-mono text-xs">NEXT_PUBLIC_CONVEX_URL</code> and run{" "}
          <code className="font-mono text-xs">pnpm convex:dev</code>.
        </p>
      </div>
    );
  }

  const missing = [
    !isClerkConfigured && "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY",
    !isConvexConfigured && "NEXT_PUBLIC_CONVEX_URL",
  ].filter(Boolean) as string[];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-10">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Settings2Icon className="size-5" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
            Connect LendLoop to your stack
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This page needs Clerk and Convex before it can show live data. Copy{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.example</code> to{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.local</code>, add
            your keys, then restart the dev server.
          </p>
          <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Still missing
            </p>
            <ul className="mt-2 space-y-1.5">
              {missing.map((item) => (
                <li key={item} className="font-mono text-xs text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="https://dashboard.convex.dev" target="_blank" rel="noreferrer">
                Open Convex <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="https://dashboard.clerk.com" target="_blank" rel="noreferrer">
                Open Clerk
              </Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            The README has the full setup, including the Clerk JWT template and n8n.
          </p>
        </div>
      </main>
    </div>
  );
}
