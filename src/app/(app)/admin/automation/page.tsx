import { AdminGuard } from "@/components/app/admin-guard";
import { AdminAutomation } from "@/features/admin";

// Client-gated page (see docs/frontend.md → "Instant navigation"): AppGate renders it
// only after Clerk and Convex load in the browser, so it cannot be validated as instant.
export const instant = false;

export const metadata = {
  title: "Admin automation",
};

export default function AdminAutomationPage() {
  return (
    <AdminGuard>
      <AdminAutomation />
    </AdminGuard>
  );
}
