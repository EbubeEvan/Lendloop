import { BellRingIcon, CheckIcon, SparklesIcon } from "lucide-react";

import { LandingAuthActions } from "@/components/landing/landing-actions";
import { ToneBadge } from "@/components/status-badge";

function MockToolCard() {
  return (
    <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Power tools
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
            DeWalt 20V drill
          </h2>
        </div>
        <ToneBadge tone="emerald" dot>
          Available
        </ToneBadge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Two batteries, charger, and a full bit set. Great for shelves and furniture assembly.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
        <span className="text-xs text-muted-foreground">This weekend · 2 days</span>
        <span className="text-xs font-medium text-primary">Request →</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          MC
        </span>
        Shared by a trusted neighbor
      </div>
    </div>
  );
}

function FloatingPill({
  icon,
  title,
  subtitle,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div
      className={`absolute z-20 flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur ${className ?? ""}`}
    >
      <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span>
        <span className="block text-xs font-semibold">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="hero-glow absolute inset-0 -z-10" />
      <div className="surface-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)] opacity-40" />

      <div className="mx-auto grid w-full max-w-6xl gap-14 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20 lg:pb-24">
        <div className="max-w-2xl">
          <ToneBadge tone="primary" icon={<SparklesIcon className="size-3.5" />}>
            Neighbor-powered lending
          </ToneBadge>

          <h1 className="mt-5 font-display text-5xl leading-[0.98] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
            Borrow what you need. <span className="text-primary italic">Lend</span> what you
            don&apos;t.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            The drill you use twice a year could help a neighbor finish a bookshelf this weekend.
            LendLoop makes sharing simple, with clear requests and automated reminders that keep
            every loan on track.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <LandingAuthActions variant="hero" />
            <span className="text-sm text-muted-foreground">
              Free to use · No fees · Just neighbors
            </span>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border/70 pt-5">
            {[
              { value: "30 days", label: "Max loan window" },
              { value: "2 roles", label: "Members and admins" },
              { value: "Daily", label: "Overdue reminders" },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-xl font-semibold tracking-tight">{stat.value}</dt>
                <dd className="mt-0.5 text-xs leading-snug text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto h-[400px] w-full max-w-md lg:h-[440px]">
          <div className="absolute inset-x-8 top-8 h-[320px] rotate-6 rounded-3xl border border-border bg-card/60 shadow-lg shadow-black/5" />
          <div className="absolute inset-x-1 top-14 rotate-[-3deg] transition-transform duration-500 hover:rotate-[-1deg]">
            <MockToolCard />
          </div>

          <FloatingPill
            icon={<CheckIcon className="size-4" />}
            title="Request approved"
            subtitle="Maya can pick up Saturday"
            className="-top-2 right-0 sm:-right-4"
          />
          <FloatingPill
            icon={<BellRingIcon className="size-4" />}
            title="Reminder sent"
            subtitle="Return the ladder tomorrow"
            className="right-2 bottom-0 sm:-right-2"
          />
        </div>
      </div>
    </section>
  );
}
