import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { LandingAuthActions } from "@/components/landing/landing-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <Button asChild variant="ghost" size="sm">
            <Link href="#board">The board</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="#how-it-works">How it works</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="#trust">Why LendLoop</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <LandingAuthActions variant="header" />
        </div>
      </div>
    </header>
  );
}
