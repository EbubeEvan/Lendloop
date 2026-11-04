import { UserProfile } from "@clerk/nextjs";

import { PageHeader } from "@/components/page";
import { SetupRequired } from "@/components/setup-required";
import { isClerkConfigured } from "@/lib/env";

// Client-gated page (see docs/frontend.md → "Instant navigation"): AppGate renders it
// only after Clerk and Convex load in the browser, so it cannot be validated as instant.
export const instant = false;

export const metadata = {
  title: "Account settings",
};

export default function SettingsPage() {
  if (!isClerkConfigured) {
    return <SetupRequired />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Account"
        title="Your account"
        description="Update your name, email, and sign-in methods. LendLoop stores only what it needs to coordinate loans."
      />
      <div className="rounded-2xl border border-border bg-card p-2 sm:p-4">
        <UserProfile routing="hash" />
      </div>
    </div>
  );
}
