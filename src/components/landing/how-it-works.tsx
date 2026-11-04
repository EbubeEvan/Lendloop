import {
  ArrowLeftRightIcon,
  CalendarCheckIcon,
  ClipboardListIcon,
  HandshakeIcon,
  InboxIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "lucide-react";

const STEPS = [
  {
    icon: PlusCircleIcon,
    title: "List what you can spare",
    body: "Add a tool with its category and a short description. It stays private until someone signs in.",
    detail: "Your listings · edit or remove anytime",
  },
  {
    icon: CalendarCheckIcon,
    title: "Request a date range",
    body: "Borrowers pick start and end dates. Overlapping requests are blocked automatically.",
    detail: "Up to 30 days per loan",
  },
  {
    icon: InboxIcon,
    title: "Approve from your inbox",
    body: "Lenders see incoming requests with the borrower's note, then approve or decline.",
    detail: "Conflicting requests are released",
  },
  {
    icon: HandshakeIcon,
    title: "Return and close the loop",
    body: "When the tool comes back, either side marks it returned. Overdue loans get reminder emails.",
    detail: "Automated follow-up via n8n",
  },
];

const GUARANTEES = [
  {
    icon: ShieldCheckIcon,
    title: "Permissions live in the backend",
    body: "Every approve, decline, return, and removal is checked inside Convex — not just hidden in the UI.",
  },
  {
    icon: ClipboardListIcon,
    title: "One request record, full history",
    body: "A borrow request moves through pending, approved, declined, cancelled, or returned. No duplicate loan table.",
  },
  {
    icon: ArrowLeftRightIcon,
    title: "Signed automation, no leaked secrets",
    body: "Convex and n8n exchange HMAC-signed payloads. Retries are idempotent, so nobody gets emailed twice.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-b border-border/60 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            How it works
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Four steps from “does anyone have…” to “thanks, got it back”
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            No group chat archaeology. LendLoop keeps the request, the dates, and the reminder trail
            in one place.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-3xl leading-none font-semibold text-border">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                <p className="mt-4 border-t border-border/70 pt-3 text-xs font-medium text-primary">
                  {step.detail}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function TrustSection() {
  return (
    <section
      id="trust"
      className="scroll-mt-24 border-b border-border/60 bg-muted/20 py-16 sm:py-20"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            Why LendLoop
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Built like a tool library, not a marketplace
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            There is no payment, no shipping, and no public profile. Just a small, well-audited
            system for neighbors who already trust each other a little.
          </p>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
              <WrenchIcon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Every feature is removable</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Listings, requests, loans, admin, and automation each live behind their own module
                and feature flag. Remove one without breaking the rest.
              </p>
            </div>
          </div>
        </div>

        <ul className="space-y-3">
          {GUARANTEES.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
