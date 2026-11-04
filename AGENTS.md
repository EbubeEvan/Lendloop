<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — working in LendLoop

Read `README.md` first for setup and architecture. This file is the short list of rules an agent must follow when changing the code.

## What this is

LendLoop is a neighborhood tool-lending app: Next.js 16 App Router on the front, Convex for data and authorization, Clerk for identity, and self-hosted n8n for signed email automation. It is a modular monolith — each product area is a feature with one public entry point.

## Commands

```bash
pnpm dev                 # Next.js + landing page
pnpm convex:dev          # Convex deployment (separate terminal)
pnpm lint                # ESLint, zero warnings
pnpm typecheck           # tsc --noEmit
pnpm test                # Vitest
pnpm verify:isolation    # feature boundary report
pnpm build               # production build
pnpm n8n:build           # regenerate n8n/workflows/*.json
pnpm format              # Prettier
```

Run `lint`, `typecheck`, and `test` before committing. Pre-push runs typecheck + tests; pre-commit runs ESLint/Prettier on staged files.

## Repository map

- `src/app` — routes only. Compose features here; do not put domain logic in pages.
- `src/features/<name>/` — one product area. `index.ts` is the only public entry point; implementation lives in `components/` (and may grow `hooks/`, `lib/` subfolders).
- `src/components` — shared UI: app shell, forms, cards, shadcn primitives.
- `src/providers`, `src/stores`, `src/hooks`, `src/lib`, `src/config` — shared client infrastructure.
- `convex/features/<name>/` — backend functions per domain.
- `convex/lib/` — auth/RBAC, validation, dates, HMAC, shared query shapes.
- `convex/schema.ts` — the data model. Changing it requires updating `convex/_generated` (see below).
- `n8n/` — compose file, env template, import script, generated workflows.
- `scripts/` — workflow generator, mock Convex HTTP server, isolation verifier.
- `tests/` — `convex/` integration tests, `unit/`, `ui/`.

## Hard rules

1. **Authorization belongs in Convex.** Every query/mutation resolves the viewer with `requireViewer` / `requireAdmin` and re-checks ownership. A hidden button is not a permission check. Never accept an actor id from the client.
2. **Features stay independent.** No feature may import another feature, and nobody may deep-import `@/features/<name>/...` from outside that feature. Cross-feature composition happens in `src/app` or moves to `src/components`.
3. **Keep `index.ts` at the feature root.** New feature files go in a subfolder, never loose next to `index.ts`. `pnpm verify:isolation` enforces both rules.
4. **Never leak private data through public queries.** The public board returns only `{_id, name, category}` for active tools.
5. **Secrets never enter the repo or workflow JSON.** Use Convex deployment env vars and `$env` in n8n. The client only sees `NEXT_PUBLIC_*` values.
6. **Exact return validators.** A Convex function with a `returns` validator must return exactly those fields; extra or missing keys fail at runtime, not compile time.
7. **Validate and sanitize inputs.** Use the shared validators in `convex/lib/validation.ts` and the Zod schemas in the UI. Dates are ISO `YYYY-MM-DD`; day calculations use UTC helpers from `convex/lib/dates.ts`.
8. **UTC everywhere on the server.** Overdue checks and reminder idempotency keys are day-scoped in UTC.

## Frontend conventions

- Server Components by default; add `"use client"` only for hooks, events, or browser APIs. Views that call `useQuery` are client components.
- Server state comes from Convex (`useQuery`, `useMutation`, `useConvex`). Do **not** add TanStack Query or fetch API routes for data that Convex already owns.
- Zustand is only for ephemeral UI state (filters, mobile nav). Do not mirror server records into it.
- Route through the viewer context: `useViewerContext()` for the provisioned user, `useViewer()` only inside the gate/provisioning layer. Admin screens additionally use `AdminGuard`.
- Forms use React Hook Form plus the kit in `src/components/forms`: `FormInput`, `FormTextarea`, `FormSelect`, `FormCheckbox`, `FormDateRange`. They require a `control`; labels, descriptions, hints, and errors are built in. Do not hand-roll a label/error pair.
- Toasts: `sonner` (`toast.success` / `toast.error`). User-safe backend errors go through `getErrorMessage` in `src/lib/errors.ts`.
- Links use `next/link`; icons come from `lucide-react`; conditional classes use `cn()`.
- Feature entry points export components only. Keep backend imports out of the barrel when a component does not need them.

### Adding a feature

1. Create `src/features/<name>/index.ts` and `src/features/<name>/components/*`.
2. Add a route under `src/app/(app)/<route>/page.tsx` that imports from `@/features/<name>`.
3. Register navigation and the flag in `src/config/navigation.ts`.
4. Add Convex functions under `convex/features/<name>/` and export them from the generated API (or run codegen).
5. Run `pnpm verify:isolation`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## Backend conventions

- Public functions live in `convex/features/**/queries.ts|mutations.ts`; shared internals in `internal.ts`; actions in `actions.ts`.
- Use `appError(code, message)` from `convex/lib/errors.ts` for expected failures. `ConvexError` messages are safe to surface; anything else is generic.
- Write audit entries for state changes via `convex/lib/audit.ts`.
- The request lifecycle is `pending → approved|declined|cancelled`, `approved → returned`. Validate transitions; do not add a second loans table.
- The public board shapes queries in `convex/lib/requestQueries.ts` / tools queries; keep projections narrow.
- `convex/_generated` is committed because this checkout has no deployment. `convex codegen` fails without `CONVEX_DEPLOYMENT`; if you change `schema.ts`, hand-update `api.d.ts`, `dataModel.d.ts`, and `server.d.ts` consistently, or run codegen against a real deployment and commit the output. Never delete these files — the app and tests import them.
- Convex code must not import from `src/` (ESLint blocks it). Shared backend helpers belong in `convex/lib`.

## Automation conventions

- Canonical signature: `v1=HMAC-SHA256(secret, timestamp + "\n" + METHOD + "\n" + path + "\n" + sha256(body))`. Headers are `x-lendloop-timestamp`, `x-lendloop-signature`, `x-lendloop-event-id`.
- Two separate secrets: `CONVEX_TO_N8N_SECRET` (outgoing) and `N8N_TO_CONVEX_SECRET` (incoming). Never reuse one for both directions.
- Replay protection is `webhookReplay`; reminder idempotency is `overdue:{requestId}:{UTC date}`. Preserve both when editing workflows.
- Edit `scripts/build-n8n-workflows.mjs`, then run `pnpm n8n:build` and commit both the generator change and the JSON. Do not hand-edit generated workflow JSON.
- Workflows must keep retries (3 attempts) and must report failures to `/http/automation/failures`.
- Mailpit is used via its HTTP API in the demo; production should switch to an SMTP credential without changing the JSON shape.

## Styling conventions

- Use semantic Tailwind tokens (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`) and the `font-display` utility. No raw hex values in components.
- Follow the existing visual language: rounded 2xl cards, generous spacing, small uppercase eyebrows, sentence-case headings. Details are in `design.md`.
- Keep dark mode working: check both `.dark` tokens and the `dark:` variants.
- Use shadcn primitives from `src/components/ui`; extend variants there rather than one-off classes. `eslint-plugin-shadcn` catches common misuse.
- Accessibility: every input has a label, icon-only buttons get `aria-label`, dialogs use the shadcn focus management, and motion respects `prefers-reduced-motion`.

## Testing

- Backend behavior belongs in `tests/convex/*.test.ts` with `convex-test`; use `t.withIdentity(...)` to prove authorization boundaries.
- Pure helpers get unit tests. UI tests focus on the form kit's wiring.
- A feature is not done until its happy path and its forbidden path both have coverage.

## Commits

Conventional Commits, enforced by commitlint. Common scopes: `tooling`, `convex`, `ui`, `app`, `n8n`, `docs`, `test`.

```
feat(app): add incoming request filters
fix(convex): reject overlapping approved requests
chore(n8n): regenerate reminder workflow
docs: document HMAC canonical string
```

Group changes logically (scaffold, backend, UI, docs, automation); do not mix generated files with unrelated refactors.

## Gotchas

- macOS is case-insensitive: `agent.md` and `AGENTS.md` are the same file. Keep the name `AGENTS.md`.
- `next dev` re-adds the Next.js agent-rules block at the top of this file. Leave it in place.
- Without Clerk/Convex keys, the app shows a setup notice; this is expected and must keep building.
- `pnpm seed` needs a signed-in user (and `ALLOW_DEV_SEED=true`); pass `--ownerEmail` if the first user is not the intended owner.
- n8n imports create new workflow records; delete old workflows or reset volumes when re-importing.
- The local n8n env must keep `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` and `NODE_FUNCTION_ALLOW_BUILTIN=crypto`, otherwise signature nodes cannot read secrets or HMAC.
