"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { isClerkConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

type Variant = "header" | "hero" | "board";

function PublicActions({ variant }: { variant: Variant }) {
  if (variant === "header") {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/sign-in">Sign in</Link>
      </Button>
    );
  }

  return (
    <Button asChild size={variant === "hero" ? "lg" : "default"}>
      <Link href="/sign-in">
        Sign in to lend or borrow
        <ArrowRightIcon data-icon="inline-end" />
      </Link>
    </Button>
  );
}

function ClerkActions({ variant }: { variant: Variant }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" aria-hidden />;
  }

  if (isSignedIn) {
    if (variant === "header") {
      return (
        <Button asChild size="sm">
          <Link href="/browse">Open LendLoop</Link>
        </Button>
      );
    }
    return (
      <Button asChild size={variant === "hero" ? "lg" : "default"}>
        <Link href="/browse">
          Open your dashboard
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </Button>
    );
  }

  return <PublicActions variant={variant} />;
}

export function LandingAuthActions({
  variant = "header",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isClerkConfigured ? <ClerkActions variant={variant} /> : <PublicActions variant={variant} />}
    </div>
  );
}
