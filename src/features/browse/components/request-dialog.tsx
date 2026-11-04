"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { differenceInCalendarDays } from "date-fns";
import { CalendarDaysIcon, Loader2Icon, SendIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FormDateRange } from "@/components/forms/form-date-range";
import { FormTextarea } from "@/components/forms/form-textarea";
import type { ToolCardData } from "@/components/tool-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/errors";
import { toIsoDate } from "@/lib/format";

const schema = z.object({
  range: z
    .custom<DateRange | undefined>(
      (value) => {
        const range = value as DateRange | undefined;
        return Boolean(range?.from && range?.to);
      },
      {
        message: "Pick a start and end date.",
      },
    )
    .refine(
      (range: DateRange | undefined) =>
        !range?.from || !range.to || differenceInCalendarDays(range.to, range.from) + 1 <= 30,
      { message: "Loans can last at most 30 days." },
    ),
  note: z.string().max(400, "Keep your note under 400 characters."),
});

type Values = z.infer<typeof schema>;

export function RequestDialog({
  tool,
  open,
  onOpenChange,
}: {
  tool: ToolCardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createRequest = useMutation(api.features.requests.mutations.create);
  const [pending, setPending] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { range: undefined, note: "" },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset({ range: undefined, note: "" });
    }
    onOpenChange(next);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const from = values.range?.from;
    const to = values.range?.to;
    if (!from || !to) {
      form.setError("range", { message: "Pick a start and end date." });
      return;
    }

    try {
      setPending(true);
      await createRequest({
        toolId: tool._id as Id<"tools">,
        startDate: toIsoDate(from),
        endDate: toIsoDate(to),
        note: values.note.trim() || undefined,
      });
      toast.success("Request sent", {
        description: `${tool.owner.name} will see your request for ${tool.name}.`,
      });
      handleOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error("Request not sent", { description: message });
      form.setError("root", { message });
    } finally {
      setPending(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            Borrow {tool.name}
          </DialogTitle>
          <DialogDescription>
            Choose the days you need it. {tool.owner.name} will approve or decline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormDateRange
            control={form.control}
            name="range"
            label="Loan dates"
            required
            description="Up to 30 days, starting from today."
            hint={
              <span className="flex items-center gap-1">
                <CalendarDaysIcon className="size-3" /> Overlapping approved loans are blocked.
              </span>
            }
          />

          <FormTextarea
            control={form.control}
            name="note"
            label="Note for the lender"
            optional
            placeholder="What are you working on? When can you pick it up?"
            maxLength={400}
            showCount
            hint="A little context helps get a yes."
          />

          {form.formState.errors.root ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
              Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
