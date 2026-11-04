"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { Loader2Icon, PlusIcon, SaveIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FormInput } from "@/components/forms/form-input";
import { FormSelect } from "@/components/forms/form-select";
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
import { CATEGORY_META, CONDITION_META, TOOL_CATEGORIES, TOOL_CONDITIONS } from "@/lib/categories";
import { getErrorMessage } from "@/lib/errors";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give the tool a name of at least 2 characters.")
    .max(80, "Keep the name under 80 characters."),
  category: z.enum(TOOL_CATEGORIES, { message: "Pick a category." }),
  condition: z.enum(TOOL_CONDITIONS, { message: "Pick a condition." }),
  description: z
    .string()
    .trim()
    .min(10, "Add at least 10 characters so neighbors know what to expect.")
    .max(500, "Keep the description under 500 characters."),
});

type Values = z.infer<typeof schema>;

const CATEGORY_OPTIONS = TOOL_CATEGORIES.map((category) => {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return {
    value: category,
    label: meta.label,
    description: meta.blurb,
    icon: <Icon className="size-4 text-muted-foreground" />,
  };
});

const CONDITION_OPTIONS = TOOL_CONDITIONS.map((condition) => ({
  value: condition,
  label: CONDITION_META[condition].label,
  description: CONDITION_META[condition].description,
}));

export function ToolFormDialog({
  open,
  onOpenChange,
  tool,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: ToolCardData | null;
}) {
  const createTool = useMutation(api.features.tools.mutations.create);
  const updateTool = useMutation(api.features.tools.mutations.update);
  const [pending, setPending] = useState(false);
  const editing = Boolean(tool);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category: "power-tools",
      condition: "good",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        tool
          ? {
              name: tool.name,
              category: tool.category,
              condition: tool.condition,
              description: tool.description,
            }
          : {
              name: "",
              category: "power-tools",
              condition: "good",
              description: "",
            },
      );
    }
  }, [open, tool, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setPending(true);
      if (tool) {
        await updateTool({
          toolId: tool._id as Id<"tools">,
          name: values.name,
          category: values.category,
          condition: values.condition,
          description: values.description,
        });
        toast.success("Listing updated", { description: `${values.name} is up to date.` });
      } else {
        await createTool({
          name: values.name,
          category: values.category,
          condition: values.condition,
          description: values.description,
        });
        toast.success("Tool listed", {
          description: `${values.name} is now visible to neighbors.`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(editing ? "Could not update listing" : "Could not create listing", {
        description: message,
      });
      form.setError("root", { message });
    } finally {
      setPending(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            {editing ? "Edit listing" : "Share a tool"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details neighbors see when they browse."
              : "Only signed-in neighbors can see the details. Everyone sees the name and category."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormInput
            control={form.control}
            name="name"
            label="Tool name"
            placeholder="e.g. DeWalt 20V cordless drill"
            required
            maxLength={80}
            hint="Be specific enough that a neighbor knows exactly what it is."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              control={form.control}
              name="category"
              label="Category"
              options={CATEGORY_OPTIONS}
              required
            />
            <FormSelect
              control={form.control}
              name="condition"
              label="Condition"
              options={CONDITION_OPTIONS}
              required
            />
          </div>

          <FormTextarea
            control={form.control}
            name="description"
            label="Description"
            placeholder="What's included, how it works, anything a borrower should know."
            required
            maxLength={500}
            showCount
            hint="Include accessories, batteries, or care notes."
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
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : editing ? (
                <SaveIcon className="size-4" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              {editing ? "Save changes" : "Publish listing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
