import { RequestsView } from "@/features/requests";

// Client-gated page (see docs/frontend.md → "Instant navigation"): AppGate renders it
// only after Clerk and Convex load in the browser, so it cannot be validated as instant.
export const instant = false;

export const metadata = {
  title: "My requests",
};

export default function RequestsPage() {
  return <RequestsView />;
}
