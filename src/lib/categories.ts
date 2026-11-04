import { Cookie, Flower2, Hammer, type LucideIcon, Package, Tent, Wrench } from "lucide-react";

export const TOOL_CATEGORIES = [
  "power-tools",
  "hand-tools",
  "garden",
  "kitchen",
  "camping",
  "other",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const TOOL_CONDITIONS = ["new", "like-new", "good", "fair", "well-loved"] as const;
export type ToolCondition = (typeof TOOL_CONDITIONS)[number];

export const CATEGORY_META: Record<
  ToolCategory,
  { label: string; shortLabel: string; icon: LucideIcon; blurb: string }
> = {
  "power-tools": {
    label: "Power tools",
    shortLabel: "Power",
    icon: Wrench,
    blurb: "Drills, sanders, saws",
  },
  "hand-tools": {
    label: "Hand tools",
    shortLabel: "Hand",
    icon: Hammer,
    blurb: "Ladders, clamps, wrenches",
  },
  garden: {
    label: "Garden",
    shortLabel: "Garden",
    icon: Flower2,
    blurb: "Tillers, blowers, pruners",
  },
  kitchen: {
    label: "Kitchen",
    shortLabel: "Kitchen",
    icon: Cookie,
    blurb: "Mixers, pans, specialty gear",
  },
  camping: {
    label: "Camping",
    shortLabel: "Camping",
    icon: Tent,
    blurb: "Tents, stoves, lanterns",
  },
  other: {
    label: "Other",
    shortLabel: "Other",
    icon: Package,
    blurb: "Everything else",
  },
};

export const CONDITION_META: Record<
  ToolCondition,
  { label: string; description: string; tone: "success" | "neutral" | "warning" }
> = {
  new: { label: "New", description: "Unused or barely used", tone: "success" },
  "like-new": { label: "Like new", description: "Excellent condition", tone: "success" },
  good: { label: "Good", description: "Normal wear, works well", tone: "neutral" },
  fair: { label: "Fair", description: "Visible wear, still reliable", tone: "warning" },
  "well-loved": {
    label: "Well-loved",
    description: "Character and quirks included",
    tone: "warning",
  },
};

export function isToolCategory(value: string): value is ToolCategory {
  return (TOOL_CATEGORIES as readonly string[]).includes(value);
}
