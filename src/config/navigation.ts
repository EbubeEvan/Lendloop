import {
  ArrowLeftRight,
  Inbox,
  LayoutGrid,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

/**
 * Feature registry — the only place navigation is declared.
 *
 * To remove a feature: delete src/features/<name>, its route folder, and its
 * entry here. No other feature imports its internals, so the remainder still
 * typechecks and runs. Convex domain dependencies are documented in AGENTS.md.
 */
export const FEATURES = {
  browse: true,
  listings: true,
  requests: true,
  loans: true,
  admin: true,
  automation: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  feature: FeatureKey;
  adminOnly?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/browse",
    label: "Browse tools",
    description: "See what neighbors are lending",
    icon: LayoutGrid,
    feature: "browse",
  },
  {
    href: "/listings",
    label: "My listings",
    description: "Manage the tools you share",
    icon: Wrench,
    feature: "listings",
  },
  {
    href: "/requests",
    label: "My requests",
    description: "Tools you have asked to borrow",
    icon: ArrowLeftRight,
    feature: "requests",
  },
  {
    href: "/incoming",
    label: "Incoming requests",
    description: "Requests for your tools",
    icon: Inbox,
    feature: "requests",
  },
  {
    href: "/loans",
    label: "Loans",
    description: "Active and returned loans",
    icon: Sparkles,
    feature: "loans",
  },
];

export const ADMIN_NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    description: "Neighborhood health",
    icon: ShieldCheck,
    feature: "admin",
    adminOnly: true,
  },
  {
    href: "/admin/loans",
    label: "All loans",
    description: "Every active and returned loan",
    icon: Sparkles,
    feature: "admin",
    adminOnly: true,
  },
  {
    href: "/admin/neighbors",
    label: "Neighbors",
    description: "Roles and trusted lenders",
    icon: Wrench,
    feature: "admin",
    adminOnly: true,
  },
  {
    href: "/admin/automation",
    label: "Automation",
    description: "n8n delivery health",
    icon: Inbox,
    feature: "automation",
    adminOnly: true,
  },
];

export function enabledNav(items: NavItem[]): NavItem[] {
  return items.filter((item) => FEATURES[item.feature]);
}
