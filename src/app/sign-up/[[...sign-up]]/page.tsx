import { SignUp } from "@clerk/nextjs";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AuthAside } from "@/components/auth/auth-aside";
import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { Logo } from "@/components/brand/logo";
import { SetupRequired } from "@/components/setup-required";
import { isClerkConfigured } from "@/lib/env";

export const metadata = {
  title: "Create an account",
};

export default function SignUpPage() {
  if (!isClerkConfigured) {
    return <SetupRequired />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthAside />
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <div className="lg:invisible">
            <Logo />
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeftIcon className="size-4" /> Back home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Join the neighborhood
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                List the tools you rarely use and borrow what you need.
              </p>
            </div>
            <Suspense fallback={<AuthFormFallback />}>
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/browse"
              />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
