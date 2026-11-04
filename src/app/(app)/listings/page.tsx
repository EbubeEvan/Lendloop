import { ListingsView } from "@/features/listings";

// Client-gated page (see docs/frontend.md → "Instant navigation"): AppGate renders it
// only after Clerk and Convex load in the browser, so it cannot be validated as instant.
export const instant = false;

export const metadata = {
  title: "My listings",
};

export default function ListingsPage() {
  return <ListingsView />;
}
