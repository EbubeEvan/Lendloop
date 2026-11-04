import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";

import { cn } from "@/lib/utils";
import { AppProviders } from "@/providers/app-providers";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LendLoop — Borrow what you need. Lend what you don't.",
    template: "%s · LendLoop",
  },
  description:
    "A neighborhood tool-lending board. List the tools you rarely use, borrow what you need, and let automated reminders handle the follow-up.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "LendLoop",
    description: "Borrow what you need. Lend what you don't.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(geist.variable, fraunces.variable)}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
