import { BellRingIcon, CheckIcon, ShieldCheckIcon } from "lucide-react";

const POINTS = [
  {
    icon: CheckIcon,
    title: "A public board, no account needed",
    body: "Anyone can see which tools exist. Names only — details stay private.",
  },
  {
    icon: BellRingIcon,
    title: "Reminders that actually fire",
    body: "Overdue loans trigger a signed n8n workflow with one email per loan per day.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Admins keep the block healthy",
    body: "Remove stale listings, review every loan, and mark trusted lenders.",
  },
];

export function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 15%, rgba(255,255,255,0.6), transparent 45%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.35), transparent 40%)",
        }}
      />
      <div className="relative">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">LendLoop</p>
        <h2 className="mt-4 max-w-sm font-display text-4xl leading-tight font-semibold tracking-tight text-balance">
          The drill you use twice a year could finish someone&apos;s bookshelf this weekend.
        </h2>
      </div>

      <ul className="relative mt-12 space-y-5">
        {POINTS.map((point) => {
          const Icon = point.icon;
          return (
            <li key={point.title} className="flex items-start gap-3.5">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/15">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{point.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-primary-foreground/70">
                  {point.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="relative mt-12 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
        <p className="text-sm leading-relaxed text-primary-foreground/90">
          “I borrowed a ladder for an afternoon and lent out my tent the same week. It feels like
          the block finally has a shared garage.”
        </p>
        <p className="mt-2 text-xs font-medium text-primary-foreground/60">A neighbor, probably</p>
      </div>
    </aside>
  );
}
