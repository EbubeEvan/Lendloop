import { Hero } from "@/components/landing/hero";
import { HowItWorks, TrustSection } from "@/components/landing/how-it-works";
import { PublicBoard } from "@/components/landing/public-board";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { SetupRequired } from "@/components/setup-required";
import { isAppConfigured } from "@/lib/env";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <PublicBoard />
        <HowItWorks />
        <TrustSection />
        {!isAppConfigured ? (
          <section className="border-b border-border/60 py-10">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
              <SetupRequired compact />
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
