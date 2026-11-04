"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { CheckIcon, Loader2Icon, RotateCcwIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import type { RequestCardData } from "@/components/request-card";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

type Action = "approve" | "decline" | "cancel" | "return";

export function RequestActions({
  request,
  compact = false,
}: {
  request: RequestCardData;
  compact?: boolean;
}) {
  const approve = useMutation(api.features.requests.mutations.approve);
  const decline = useMutation(api.features.requests.mutations.decline);
  const cancel = useMutation(api.features.requests.mutations.cancel);
  const markReturned = useMutation(api.features.requests.mutations.markReturned);
  const [pending, setPending] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState<Action | null>(null);

  const run = async (action: Action) => {
    try {
      setPending(action);
      if (action === "approve") {
        const result = await approve({ requestId: request._id as Id<"borrowRequests"> });
        toast.success("Request approved", {
          description:
            result.declinedOverlaps > 0
              ? `${result.declinedOverlaps} overlapping request(s) were rejected automatically.`
              : `${request.borrower.name} can pick up ${request.tool.name}.`,
        });
      } else if (action === "decline") {
        await decline({ requestId: request._id as Id<"borrowRequests"> });
        toast.success("Request rejected", {
          description: `The request is closed and ${request.borrower.name} has been notified.`,
        });
      } else if (action === "cancel") {
        await cancel({ requestId: request._id as Id<"borrowRequests"> });
        toast.success("Request cancelled");
      } else {
        await markReturned({ requestId: request._id as Id<"borrowRequests"> });
        toast.success("Loan closed", {
          description: `${request.tool.name} is marked as returned.`,
        });
      }
      setConfirming(null);
    } catch (error) {
      toast.error("That action did not go through", { description: getErrorMessage(error) });
    } finally {
      setPending(null);
    }
  };

  const size = compact ? "sm" : "default";
  const hasActions =
    request.canApprove || request.canDecline || request.canCancel || request.canReturn;

  if (!hasActions) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {request.canApprove ? (
          <Button size={size} onClick={() => void run("approve")} disabled={pending !== null}>
            {pending === "approve" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Approve
          </Button>
        ) : null}

        {request.canDecline ? (
          <Button
            size={size}
            variant="outline"
            onClick={() => setConfirming("decline")}
            disabled={pending !== null}
          >
            <XIcon data-icon="inline-start" className="size-4" /> Reject
          </Button>
        ) : null}

        {request.canCancel ? (
          <Button
            size={size}
            variant="outline"
            onClick={() => setConfirming("cancel")}
            disabled={pending !== null}
          >
            Cancel request
          </Button>
        ) : null}

        {request.canReturn ? (
          <Button
            size={size}
            variant="outline"
            onClick={() => setConfirming("return")}
            disabled={pending !== null}
          >
            {pending === "return" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RotateCcwIcon className="size-4" />
            )}
            Mark returned
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null);
          }
        }}
        title={
          confirming === "decline"
            ? "Reject this request?"
            : confirming === "cancel"
              ? "Cancel your request?"
              : "Mark this loan as returned?"
        }
        description={
          confirming === "decline"
            ? `The request closes right away, ${request.borrower.name} sees it as rejected, and the dates open up for others.`
            : confirming === "cancel"
              ? "The lender will no longer see this request. You can request different dates later."
              : "Only do this once the tool is back in the lender's hands. The loan will close for both sides."
        }
        confirmLabel={
          confirming === "decline"
            ? "Reject request"
            : confirming === "cancel"
              ? "Cancel request"
              : "Mark returned"
        }
        destructive={confirming === "decline" || confirming === "cancel"}
        pending={pending !== null}
        onConfirm={() => {
          if (confirming) {
            void run(confirming);
          }
        }}
      />
    </>
  );
}
