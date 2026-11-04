import { LoansView } from "@/features/loans";

// Client-gated page (see docs/frontend.md → "Instant navigation"): AppGate renders it
// only after Clerk and Convex load in the browser, so it cannot be validated as instant.
export const instant = false;

export const metadata = {
  title: "Loans",
};

export default function LoansPage() {
  return <LoansView />;
}
