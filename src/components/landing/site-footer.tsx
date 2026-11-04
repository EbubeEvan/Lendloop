import { ArrowRightIcon, GitBranchIcon } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { LandingAuthActions } from "@/components/landing/landing-actions";
import { Button } from "@/components/ui/button";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A neighborhood tool-lending board. Borrow what you need, lend what you don&apos;t, and
              let the reminders handle the follow-up.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <LandingAuthActions variant="header" />
              <Button asChild variant="ghost" size="sm">
                <Link href="#board">
                  See the board <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Product
              </p>
              <ul className="mt-2.5 space-y-2">
                <li>
                  <Link className="text-muted-foreground hover:text-foreground" href="#board">
                    Public board
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-muted-foreground hover:text-foreground"
                    href="#how-it-works"
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link className="text-muted-foreground hover:text-foreground" href="#trust">
                    Why LendLoop
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Account
              </p>
              <ul className="mt-2.5 space-y-2">
                <li>
                  <Link className="text-muted-foreground hover:text-foreground" href="/sign-in">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link className="text-muted-foreground hover:text-foreground" href="/sign-up">
                    Create an account
                  </Link>
                </li>
                <li>
                  <Link className="text-muted-foreground hover:text-foreground" href="/browse">
                    Browse tools
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Project
              </p>
              <ul className="mt-2.5 space-y-2">
                <li>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <GitBranchIcon className="size-3.5" /> Take-home build
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© LendLoop. Built for neighbors.</p>
          <p>Next.js · Clerk · Convex · n8n</p>
        </div>
      </div>
    </footer>
  );
}
