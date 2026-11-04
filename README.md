# LendLoop

A neighborhood tool-lending board. Neighbors list the tools they are willing to share, request a date range, and the owner approves, declines, or marks the tool returned. A self-hosted n8n instance sends the notifications and the daily overdue reminders, with every call between n8n and Convex signed.

The project is a **modular monolith**: each product area is a self-contained feature with a single public entry point, so a feature can be deleted without breaking the rest of the app. Backend authorization is enforced in Convex, never in the UI.

---

## Stack

| Layer      | Choice                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19, TypeScript, Turbopack)                |
| Auth       | Clerk (email/password + optional social), JWT template for Convex       |
| Data       | Convex (reactive queries, mutations, scheduled actions, HTTP endpoints) |
| UI         | Tailwind CSS v4, shadcn/ui (Radix), lucide-react, Sonner                |
| Forms      | React Hook Form + Zod, shared form kit                                  |
| Client UI  | Zustand (filters, mobile nav) — Convex is the server-state layer        |
| Automation | Self-hosted n8n + Postgres + Mailpit (local), HMAC-signed HTTP          |
| Quality    | ESLint 9, Prettier, Vitest, Testing Library, Husky, commitlint          |

---

## Quick start

Requirements: Node 20.9+, pnpm 10, Docker (for n8n and Mailpit).

```bash
pnpm install
cp .env.example .env.local
cp .env.convex.example .env.convex.local
```

1. **Create a Convex deployment**

   ```bash
   pnpm exec convex dev
   ```

   The CLI writes `NEXT_PUBLIC_CONVEX_URL` into `.env.local`. Keep the command running while you develop. `convex/_generated` is checked in, so the app also builds before a deployment exists.

2. **Create a Clerk application**

   - Copy the publishable and secret keys into `.env.local`.
   - In Clerk → **JWT templates**, create the `convex` template (Clerk's Convex integration guide has the exact claims).
   - Copy the Frontend API URL into `CLERK_JWT_ISSUER_DOMAIN` in `.env.convex.local`.

3. **Push backend secrets**

   ```bash
   pnpm exec convex env set --from-file .env.convex.local
   ```

   Generate the two HMAC secrets once and reuse the same values in `n8n/.env`:

   ```bash
   openssl rand -hex 32   # CONVEX_TO_N8N_SECRET
   openssl rand -hex 32   # N8N_TO_CONVEX_SECRET
   ```

4. **Run the app**

   ```bash
   pnpm dev
   ```

   Sign in once, then seed demo data (the owner must exist before seeding):

   ```bash
   pnpm seed -- '{"ownerEmail":"you@example.com"}'
   ```

   Add your email to `ADMIN_EMAILS` in `.env.convex.local` and push the env again to get the admin area.

5. **Start the automation stack** (optional, see below)

   ```bash
   pnpm n8n:up
   pnpm n8n:import
   ```

The app is designed to fail soft: without Clerk/Convex keys the landing page and a setup notice still render, and the build and tests pass.

---

## Environment variables

### Next.js (`.env.local`, never committed)

| Variable                            | Required | Purpose                                            |
| ----------------------------------- | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`            | yes      | Convex deployment URL, printed by `convex dev`     |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes      | Clerk browser key                                  |
| `CLERK_SECRET_KEY`                  | yes      | Clerk server key                                   |
| `NEXT_PUBLIC_APP_URL`               | no       | Public origin used in links, defaults to localhost |
| `NEXT_PUBLIC_CLERK_*_URL`           | no       | Sign-in/up routing overrides                       |

### Convex deployment (`.env.convex.local`)

Backend values are pushed with `convex env set`; they are never exposed to the browser.

| Variable                  | Purpose                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| `CLERK_JWT_ISSUER_DOMAIN` | Verifies Clerk JWTs in `convex/auth.config.ts`                                   |
| `ADMIN_EMAILS`            | Comma-separated allowlist promoted to admin on first sign-in                     |
| `CONVEX_TO_N8N_SECRET`    | HMAC key for outgoing request notifications                                      |
| `N8N_TO_CONVEX_SECRET`    | HMAC key for n8n → Convex overdue/reminder/failure calls                         |
| `N8N_WEBHOOK_URL`         | Public n8n webhook, e.g. `http://localhost:5678/webhook/lendloop/request-events` |
| `APP_URL`                 | Origin used in notification links                                                |
| `ALLOW_DEV_SEED`          | Enables the demo seed mutation; keep `false` outside local development           |

### n8n (`n8n/.env`, created from `n8n/.env.example`)

`N8N_ENCRYPTION_KEY`, the two HMAC secrets (identical to Convex), `CONVEX_SITE_URL`, `APP_URL`, Mailpit settings, and Postgres credentials. Workflow JSON contains **no secrets**; every secret is read from `$env` at runtime.

---

## Local automation (n8n + Mailpit)

The stack in `n8n/docker-compose.yml` runs Postgres, n8n, and Mailpit. Mailpit captures every email at <http://localhost:8025>, so the demo needs no SMTP account. The workflows call Mailpit's HTTP API instead of an SMTP credential, which means they run immediately after import.

```bash
pnpm n8n:up       # start Postgres + n8n + Mailpit (creates n8n/.env on first run)
pnpm n8n:import   # import n8n/workflows/*.json
pnpm n8n:logs     # tail n8n
pnpm n8n:down     # stop the stack
```

Open <http://localhost:5678> and activate the three workflows:

1. **LendLoop — Request notifications** — webhook trigger, path `lendloop/request-events`.
2. **LendLoop — Overdue reminders** — schedule trigger, daily at 09:00 UTC.
3. **LendLoop — Error handler** — error trigger.

In the settings of the first two, select **LendLoop — Error handler** as the error workflow. n8n imports workflows as new records each time, so re-importing creates duplicates; delete the old ones or reset the volume.

### What each workflow does

**Request notifications** (`n8n/workflows/request-notifications.json`)

1. Convex calls the webhook after a request is created, approved, declined, cancelled, or returned.
2. A Code node recomputes the signature over the raw JSON body and rejects stale timestamps (5-minute window) or mismatched signatures.
3. Valid events are rendered into an email and sent through Mailpit.
4. Invalid events get a `401`; Convex records the failed delivery and retries the dispatch up to three times.

**Overdue reminders** (`n8n/workflows/overdue-reminders.json`)

1. At 09:00 UTC, n8n signs a `GET /http/automation/overdue` call and fetches active loans past their end date.
2. Loans already reminded on the current UTC day are skipped, so retries and manual runs cannot double-send.
3. For each remaining loan, n8n sends the reminder email, then writes back `POST /http/automation/reminders`.
4. The write-back carries `x-lendloop-event-id: overdue:{requestId}:{YYYY-MM-DD}`. Convex stores the key in `webhookReplay` and records the reminder in `automationEvents` exactly once.
5. HTTP requests retry three times; exhausted retries reach the error workflow.

**Error handler** (`n8n/workflows/error-handler.json`)

Receives n8n execution failures and reports a signed `POST /http/automation/failures` with workflow, node, execution id, and message. Convex writes a `workflow.failed` event visible on **Admin → Automation**.

### Trying reminders without Convex

`pnpm mock:http` starts a signature-verifying mock of the three Convex endpoints on port 3210, with two sample overdue loans (one already reminded today). Point `CONVEX_SITE_URL=http://host.docker.internal:3210` in `n8n/.env`, start n8n and Mailpit, run **LendLoop — Overdue reminders** manually, and watch the Mailpit inbox and the mock log.

```bash
N8N_TO_CONVEX_SECRET=<value from n8n/.env> pnpm mock:http
```

---

## Architecture

```
src/
├── app/                     Routes; the only place features are composed
│   ├── (app)/               Authenticated shell + AppGate
│   ├── sign-in, sign-up/    Branded Clerk screens
│   └── page.tsx             Public landing page
├── features/                One folder per product area
│   ├── browse/
│   │   ├── components/      Views and dialogs
│   │   └── index.ts         The only public entry point
│   ├── listings/
│   ├── requests/
│   ├── loans/
│   └── admin/
├── components/              Shared UI: app shell, forms, cards, shadcn primitives
├── providers/               Clerk/Convex providers, viewer context, theme
├── stores/                  Zustand UI state
├── lib/                     Env, categories, formatting, status metadata
└── config/navigation.ts     Feature registry and navigation

convex/
├── schema.ts                users, tools, borrowRequests, automationEvents, auditLogs, webhookReplay
├── auth.config.ts           Clerk JWT verification
├── http.ts                  HMAC-verified n8n endpoints
├── crons.ts                 Replay-key cleanup
├── features/                tools, requests, loans, admin, automation, auth
├── lib/                     auth/RBAC, validation, dates, HMAC, shared query shapes
└── seed.ts                  Local demo data (guarded)
```

### Request lifecycle

```
pending ──approve──▶ approved ──return──▶ returned
   │                    │
   └──decline──▶ declined
   │
   └──cancel───▶ cancelled
```

`borrowRequests` is the single lifecycle table; a “loan” is an approved request, and “overdue” is derived (`status = approved` and `endDate < today`). There is no separate loans table to keep in sync.

### Authorization

Every Convex function derives the caller from the Clerk identity and the `users` table:

- **Public**: the landing board query projects only `{_id, name, category}` of active tools. No owner, description, or request data.
- **Signed in**: list tools, request a date range, cancel a pending request, view own requests.
- **Owners**: approve/decline requests for their own tools, edit/remove their own listings, mark their loans returned.
- **Borrowers**: mark a loan returned only while it is active.
- **Admins**: remove any listing, view every loan and every user, mark a user as Trusted Lender. Roles come from the server-side `ADMIN_EMAILS` allowlist; the `users.role` column is the source of truth afterwards.
- **Trusted Lender**: a badge set by an admin; it does not silently grant data access.

The UI hides actions a viewer cannot perform, but the mutation repeats the check — calling it directly with a forged id still fails. See `tests/convex/rbac.test.ts`.

### Data minimization and security

- The public board never exposes emails, names, descriptions, or request records.
- All inputs are validated with Convex validators and shared Zod schemas before they reach the database.
- Date ranges are validated (ISO `YYYY-MM-DD`, start ≤ end, no past starts, bounded length).
- HMAC canonical string: `v1=HMAC-SHA256(secret, timestamp + "\n" + METHOD + "\n" + path + "\n" + sha256(body))`, with a 5-minute clock-skew window and constant-time comparison.
- Inbound events are deduplicated in `webhookReplay`; reminder keys are scoped per loan per UTC day.
- Secrets live only in deployment env vars; workflow JSON is safe to share or export.
- Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, CSP-friendly defaults) are set in `next.config.ts`.
- Mutations that change state write an audit log; automation events capture delivery status and failure reasons.

### Removing a feature

Delete `src/features/<name>`, its route folder under `src/app/(app)`, and its entry in `src/config/navigation.ts`. `pnpm verify:isolation` and ESLint boundaries fail if another module deep-imports a feature, so the remaining code still builds. Backend modules under `convex/features` follow the same rule; requests schedule automation through the generated `internal` API, which is the one documented cross-feature dependency (delete the `scheduler.runAfter` calls if automation is removed).

---

## Scripts

| Script                  | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `pnpm dev`              | Next.js dev server                                            |
| `pnpm build`            | Production build                                              |
| `pnpm lint`             | ESLint with zero warnings allowed                             |
| `pnpm typecheck`        | `tsc --noEmit`                                                |
| `pnpm test`             | Vitest (Convex lifecycle + RBAC, HMAC, dates, validation, UI) |
| `pnpm test:coverage`    | Coverage report                                               |
| `pnpm test:e2e`         | Playwright smoke suite (no keys needed)                       |
| `pnpm format`           | Prettier write                                                |
| `pnpm convex:dev`       | Start the Convex dev deployment                               |
| `pnpm convex:deploy`    | Deploy Convex functions to production                         |
| `pnpm seed`             | Seed demo tools and requests (requires `ALLOW_DEV_SEED=true`) |
| `pnpm n8n:up`           | Start Postgres + n8n + Mailpit                                |
| `pnpm n8n:import`       | Import the three workflows                                    |
| `pnpm n8n:build`        | Regenerate `n8n/workflows/*.json` from the generator          |
| `pnpm mock:http`        | Signature-verifying mock of the Convex automation endpoints   |
| `pnpm verify:isolation` | Check feature boundaries and public entry points              |

Quality gates run automatically: Husky's pre-commit formats and lints staged files; pre-push runs `typecheck` and `test`; commitlint enforces Conventional Commits.

---

## Testing

```bash
pnpm test        # Vitest: backend, helpers, form kit
pnpm test:e2e    # Playwright smoke suite (desktop + mobile Chromium)
```

- `tests/convex/lifecycle.test.ts` — the full loan lifecycle (request → approve → return) with recipients per event, signed outgoing webhooks and their minimal payload, three-attempt retry with a visible failure record, the signed overdue endpoint, idempotent reminder write-backs, tamper rejection, and n8n failure reports.
- `tests/convex/rbac.test.ts` — real Convex functions against `convex-test`, covering unauthenticated access, owner/borrower boundaries, admin-only mutations, public projection, and invalid transitions.
- `tests/unit/hmac.test.ts` — signature construction, skew window, tampering.
- `tests/unit/dates.test.ts` — ISO date handling and overdue derivation.
- `tests/unit/validation.test.ts` — request and tool input rules.
- `tests/ui/form-input.test.tsx` — label, helper text, error wiring, and password toggle.

- `e2e/smoke.spec.ts` — runs the real app without Clerk or Convex keys: tagline and sign-in call to action, the public board shows names and categories only, category filters, axe WCAG 2 A/AA scan, no horizontal scroll on mobile, and every protected route renders the setup notice instead of crashing. Run `pnpm exec playwright install chromium` once before the first run.

Signed-in browser flows (owner lists, borrower requests, owner approves and closes) are not automated yet; they need a Clerk test instance (`@clerk/testing`) and a Convex dev deployment, and would run only when those secrets are present.

`convex-test` imports every backend module through `import.meta.glob`, so new functions are covered by the module type-check automatically.

---

## Production checklist

1. **Clerk**: switch to a production instance, configure the domain and the `convex` JWT template, restrict sign-up methods as needed.
2. **Convex**: `pnpm convex:deploy`, then set `CLERK_JWT_ISSUER_DOMAIN`, `ADMIN_EMAILS`, both HMAC secrets, `N8N_WEBHOOK_URL`, and `APP_URL` in the production deployment. Set `ALLOW_DEV_SEED=false`.
3. **Secrets**: rotate both HMAC secrets, store them in a secret manager, and keep the 5-minute skew window short. Use HTTPS-only endpoints and reject plaintext webhooks at the proxy.
4. **n8n**: move off the local compose file to a managed or hardened host with Postgres, a strong `N8N_ENCRYPTION_KEY`, HTTPS, and editor access behind SSO or basic auth. Do not expose the editor publicly. Replace Mailpit with a real SMTP/OAuth credential; the workflow JSON stays credential-free. Assign the error workflow and monitor failed executions. Enable execution pruning and backups.
5. **Next.js**: deploy to Vercel (or any Node host) with the Clerk and Convex values for the target environment. Set `NEXT_PUBLIC_APP_URL` to the production origin.
6. **Abuse and scale**: add rate limiting at the edge for the webhook and auth routes, keep Clerk bot protection on, and review the `take(100)` caps in admin and overdue queries if the neighborhood grows.
7. **Observability**: alert on `automationEvents` rows with `status = failed` and on n8n execution failures; the admin automation screen is the operational view.

## Known limitations

- `convex/_generated` is hand-maintained and committed because no deployment is available in this environment. Running `convex dev` against a real deployment regenerates it; commit the result.
- No image uploads or per-day availability calendar — the request model is a date range with a free-text note.
- Email delivery is synchronous best-effort with three immediate retries; a queue with exponential backoff would be the next step at scale.
- n8n imports create new workflow records on every run; this is an n8n CLI constraint, not a project bug.
