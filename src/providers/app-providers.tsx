"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clerkPublishableKey, convexUrl, isClerkConfigured, isConvexConfigured } from "@/lib/env";
import { ThemeProvider } from "@/providers/theme-provider";

let convexClient: ConvexReactClient | null = null;

function getConvexClient(url: string): ConvexReactClient {
  if (!convexClient) {
    convexClient = new ConvexReactClient(url);
  }
  return convexClient;
}

const clerkAppearance = {
  variables: {
    colorPrimary: "#2f6b4f",
    colorText: "#1c2a23",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    card: "shadow-xl shadow-black/5 border border-border",
    headerTitle: "font-display tracking-tight",
    formButtonPrimary: "bg-primary hover:bg-primary/90",
    footerActionLink: "text-primary hover:text-primary/80",
  },
} as const;

function Chrome({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster richColors closeButton position="top-center" />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  if (!isClerkConfigured) {
    return <Chrome>{children}</Chrome>;
  }

  if (!isConvexConfigured) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey} appearance={clerkAppearance}>
        <Chrome>{children}</Chrome>
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} appearance={clerkAppearance}>
      <ConvexProviderWithClerk client={getConvexClient(convexUrl)} useAuth={useAuth}>
        <Chrome>{children}</Chrome>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
