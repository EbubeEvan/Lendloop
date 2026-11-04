"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { InboxIcon, PencilIcon, PlusIcon, Trash2Icon, WrenchIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, PageHeader } from "@/components/page";
import { ToolCard, type ToolCardData, ToolCardSkeleton } from "@/components/tool-card";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

import { ToolFormDialog } from "./tool-form-dialog";

export function ListingsView() {
  const tools = useQuery(api.features.tools.queries.listMine);
  const removeTool = useMutation(api.features.tools.mutations.remove);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ToolCardData | null>(null);
  const [removing, setRemoving] = useState<ToolCardData | null>(null);
  const [pending, setPending] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (tool: ToolCardData) => {
    setEditing(tool);
    setFormOpen(true);
  };

  const confirmRemove = async () => {
    if (!removing) {
      return;
    }
    try {
      setPending(true);
      const result = await removeTool({ toolId: removing._id as Id<"tools"> });
      toast.success("Listing removed", {
        description:
          result.declinedRequests > 0
            ? `${result.declinedRequests} pending request(s) were rejected.`
            : `${removing.name} is no longer on the board.`,
      });
      setRemoving(null);
    } catch (error) {
      toast.error("Could not remove listing", { description: getErrorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="My listings"
        title="The tools you share"
        description="Keep descriptions accurate and respond to requests. Removing a listing is permanent."
        actions={
          <Button onClick={openCreate}>
            <PlusIcon data-icon="inline-start" className="size-4" /> Add a tool
          </Button>
        }
      />

      {tools === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <ToolCardSkeleton key={index} />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <EmptyState
          icon={WrenchIcon}
          title="You haven't listed anything yet"
          description="The drill in the closet, the ladder in the garage, the tent you use twice a year — neighbors can put them to work."
          action={
            <Button onClick={openCreate}>
              <PlusIcon data-icon="inline-start" className="size-4" /> Share your first tool
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <InboxIcon className="size-4 text-primary" />
            <span>
              {tools.length} active {tools.length === 1 ? "listing" : "listings"}
              {tools.some((tool) => tool.pendingCount > 0)
                ? " · you have pending requests waiting"
                : " · no pending requests"}
            </span>
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link href="/incoming">Review incoming</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard
                key={tool._id}
                tool={tool}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(tool)}
                    >
                      <PencilIcon data-icon="inline-start" className="size-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRemoving(tool)}
                    >
                      <Trash2Icon data-icon="inline-start" className="size-3.5" /> Remove
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        </>
      )}

      <ToolFormDialog open={formOpen} onOpenChange={setFormOpen} tool={editing} />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null);
          }
        }}
        title={`Remove ${removing?.name ?? "this listing"}?`}
        description="The listing disappears from the board. Pending requests will be rejected automatically. This cannot be undone."
        confirmLabel="Remove listing"
        destructive
        pending={pending}
        onConfirm={() => void confirmRemove()}
      />
    </div>
  );
}
