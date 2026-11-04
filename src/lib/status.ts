import type { ToolCategory, ToolCondition } from "@/lib/categories";

export type RequestStatus = "pending" | "approved" | "declined" | "cancelled" | "returned";
export type Availability = "available" | "reserved" | "on-loan";

export const REQUEST_STATUS_META: Record<
  RequestStatus,
  { label: string; tone: "amber" | "emerald" | "rose" | "stone" | "sky" }
> = {
  pending: { label: "Pending", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  declined: { label: "Rejected", tone: "rose" },
  cancelled: { label: "Cancelled", tone: "stone" },
  returned: { label: "Returned", tone: "sky" },
};

export const AVAILABILITY_META: Record<
  Availability,
  { label: string; tone: "emerald" | "amber" | "sky" }
> = {
  available: { label: "Available", tone: "emerald" },
  reserved: { label: "Reserved", tone: "amber" },
  "on-loan": { label: "On loan", tone: "sky" },
};

export function categoryLabel(category: ToolCategory): string {
  const labels: Record<ToolCategory, string> = {
    "power-tools": "Power tools",
    "hand-tools": "Hand tools",
    garden: "Garden",
    kitchen: "Kitchen",
    camping: "Camping",
    other: "Other",
  };
  return labels[category];
}

export function conditionLabel(condition: ToolCondition): string {
  const labels: Record<ToolCondition, string> = {
    new: "New",
    "like-new": "Like new",
    good: "Good",
    fair: "Fair",
    "well-loved": "Well-loved",
  };
  return labels[condition];
}
