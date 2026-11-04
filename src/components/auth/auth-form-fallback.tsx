import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for Clerk's <SignIn>/<SignUp> while they stream in. They read
 * the URL, which with Cache Components must happen inside <Suspense>, so the
 * rest of the auth page can still be prerendered.
 */
export function AuthFormFallback() {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      aria-busy="true"
      aria-label="Loading sign-in form"
    >
      <Skeleton className="h-6 w-2/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="mt-2 h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
