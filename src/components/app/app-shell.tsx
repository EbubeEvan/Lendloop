"use client";

import { useClerk } from "@clerk/nextjs";
import { ChevronsUpDownIcon, LogOutIcon, MenuIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/user-avatar";
import { ADMIN_NAV, enabledNav, type NavItem, PRIMARY_NAV } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useViewerContext } from "@/providers/viewer-provider";

type Viewer = NonNullable<ReturnType<typeof useViewerContext>["viewer"]>;

function NavSection({
  label,
  items,
  onNavigate,
}: {
  label?: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <p className="px-2.5 pt-4 pb-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
      ) : null}
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function UserMenu({ viewer }: { viewer: Viewer }) {
  const { signOut } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card p-2 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <UserAvatar name={viewer.name} imageUrl={viewer.imageUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{viewer.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {viewer.role === "admin" ? "Administrator" : "Neighbor"}
            </span>
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{viewer.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{viewer.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon className="size-4" /> Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void signOut({ redirectUrl: "/" });
          }}
        >
          <LogOutIcon className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ viewer, onNavigate }: { viewer: Viewer; onNavigate?: () => void }) {
  const primary = enabledNav(PRIMARY_NAV);
  const admin = viewer.role === "admin" ? enabledNav(ADMIN_NAV) : [];

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between px-1.5 py-2">
        <Logo href="/browse" />
        <ThemeToggle />
      </div>

      <nav className="flex flex-1 flex-col" aria-label="App">
        <NavSection items={primary} onNavigate={onNavigate} />
        {admin.length > 0 ? (
          <NavSection label="Administration" items={admin} onNavigate={onNavigate} />
        ) : null}
      </nav>

      <div className="mt-auto pt-2">
        <UserMenu viewer={viewer} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { viewer, isLoading } = useViewerContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/20 lg:grid lg:grid-cols-[268px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-border bg-sidebar lg:block">
        {viewer ? <SidebarContent viewer={viewer} /> : null}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation">
                  <MenuIcon data-icon="inline-start" className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                {viewer ? (
                  <SidebarContent viewer={viewer} onNavigate={() => setMobileOpen(false)} />
                ) : null}
              </SheetContent>
            </Sheet>
            <Logo href="/browse" compact />
            <span className="font-display text-lg font-semibold tracking-tight">LendLoop</span>
          </div>
          {viewer ? <UserAvatar name={viewer.name} imageUrl={viewer.imageUrl} /> : null}
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
                <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-40 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
