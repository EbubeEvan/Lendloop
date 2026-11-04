import { ArrowLeftIcon, CompassIcon } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CompassIcon className="size-5" />
          </span>
          <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            404
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            This page isn&apos;t on the block
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The link may be old, or the page may have moved.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">
              <ArrowLeftIcon data-icon="inline-start" className="size-4" /> Back to LendLoop
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
