"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheckIcon, SearchIcon, UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/page";
import { ToneBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/user-avatar";
import { getErrorMessage } from "@/lib/errors";
import { formatRelative } from "@/lib/format";
import { useViewerContext } from "@/providers/viewer-provider";

export function AdminNeighbors() {
  const users = useQuery(api.features.admin.queries.listUsers);
  const setTrustedLender = useMutation(api.features.admin.mutations.setTrustedLender);
  const { viewer } = useViewerContext();
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!users) {
      return [];
    }
    const term = search.trim().toLowerCase();
    if (!term) {
      return users;
    }
    return users.filter(
      (user) => user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term),
    );
  }, [users, search]);

  const toggleTrusted = async (userId: string, trusted: boolean, name: string) => {
    try {
      setPendingId(userId);
      await setTrustedLender({ userId: userId as Id<"users">, trusted });
      toast.success(trusted ? `${name} is now a trusted lender` : `Trusted status removed`);
    } catch (error) {
      toast.error("Could not update trusted lender", { description: getErrorMessage(error) });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Neighbors"
        description="Every account in the neighborhood. Trusted lenders get a badge on their listings."
      />

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search neighbors"
          className="h-10 bg-card pl-9"
        />
      </div>

      {users === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" aria-hidden />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No neighbors match"
          description="Try a different name or email. Accounts appear after neighbors sign in."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {visible.map((user) => (
            <li key={user._id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <UserAvatar name={user.name} imageUrl={user.imageUrl} className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  {user.role === "admin" ? <ToneBadge tone="primary">Admin</ToneBadge> : null}
                  {user.trustedLender ? (
                    <ToneBadge tone="emerald" icon={<BadgeCheckIcon className="size-3" />}>
                      Trusted
                    </ToneBadge>
                  ) : null}
                  {user._id === viewer?._id ? (
                    <span className="text-[11px] text-muted-foreground">(you)</span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>

              <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                <p>
                  {user.toolCount} {user.toolCount === 1 ? "tool" : "tools"} · {user.loanCount}{" "}
                  {user.loanCount === 1 ? "loan" : "loans"}
                </p>
                <p>Joined {formatRelative(user.createdAt)}</p>
              </div>

              <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="hidden sm:inline">Trusted lender</span>
                <Switch
                  checked={user.trustedLender}
                  disabled={pendingId === user._id || user._id === viewer?._id}
                  onCheckedChange={(checked) => void toggleTrusted(user._id, checked, user.name)}
                  aria-label={`Mark ${user.name} as a trusted lender`}
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Admin roles come from the server-side <code className="font-mono">ADMIN_EMAILS</code>{" "}
        allowlist. You cannot change another admin&apos;s role from the UI.
      </p>
    </div>
  );
}
