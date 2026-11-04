# Frontend guide

How UI work is organized in LendLoop. Read `AGENTS.md` for the rules and `design.md` for the visual language. This document is the practical pattern guide.

## The rendering pipeline

```
RootLayout (server)
└── AppProviders (client)
    ├── ClerkProvider                 when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY exists
    ├── ConvexProviderWithClerk       when NEXT_PUBLIC_CONVEX_URL also exists
    ├── ThemeProvider + TooltipProvider + Toaster
    └── {children}

(auth) layout
└── AppFrame
    ├── Sidebar / mobile Sheet
    └── AppGate
        ├── SetupRequired             missing Clerk/Convex keys
        ├── redirect to /sign-in      signed out
        └── ViewerProvider
            ├── useViewer()           provisions users.store, exposes viewer
            └── AdminGuard            wraps /admin/* pages
```

Consequences:

- Everything under `src/app/(app)` can assume a provisioned viewer. Never re-fetch or re-provision the user inside a feature.
- Landing and auth pages must keep working without keys. Guard with `isClerkConfigured` / `isAppConfigured` from `src/lib/env.ts` before touching Clerk or Convex hooks. Hooks must not be called conditionally — split components instead.
- The Convex client is created once at module scope in `app-providers.tsx`; do not create another.

## Feature modules

```
src/features/browse/
├── components/
│   ├── browse-view.tsx
│   └── request-dialog.tsx
└── index.ts
```

`index.ts` is the contract:

```ts
export { BrowseView } from "./components/browse-view";
export { RequestDialog } from "./components/request-dialog";
```

Rules that matter in practice:

- Pages import **only** `@/features/<name>`; never `@/features/<name>/components/...`.
- A feature never imports another feature. Shared pieces move to `src/components` or `src/lib`.
- Internal imports stay relative (`./request-dialog`, `../lib/...`) so moving files inside the feature does not touch the outside world.
- The isolation script also rejects loose files at the feature root. `index.ts` is the only file allowed there.

To remove a feature: delete its folder, its route, and its entry in `src/config/navigation.ts`. The flag in `FEATURES` filters the nav; routes for deleted features should be deleted with them.

## Data fetching with Convex

Convex queries are reactive: components subscribe and re-render when the database changes. Do not wrap them in `useEffect`, `useState`, or a client cache.

```tsx
"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

export function LoansView() {
  const loans = useQuery(api.features.loans.queries.listMine, {});
  if (loans === undefined) return <LoansSkeleton />;
  if (loans.length === 0) return <EmptyState ... />;
  return <LoanList loans={loans} />;
}
```

Conventions:

- `undefined` means loading; `[]` means empty. Render distinct states.
- Pass `"skip"` only when a query genuinely cannot run yet (e.g. signed out). TypeScript accepts `"skip"` as the args value.
- Mutations are `useMutation`; catch errors and show `getErrorMessage(error)` in a toast. Keep the dialog open on failure.
- There is no TanStack Query in this project. Server data belongs to Convex; client cache libraries would duplicate its websocket cache.
- Filtering that the server already supports (category) goes in the query args. Search and “available only” are local, ephemeral refinements.

### Loading and empty states

Use the shared building blocks instead of inventing new ones:

- `PageHeader` — eyebrow, title, description, actions.
- `EmptyState` — icon, title, description, action.
- `StatCard` — admin/dashboard numbers.
- `ToolCardSkeleton`, `RequestCardSkeleton` — loading placeholders that match the real cards.

## Client state

Zustand (`src/stores/ui-store.ts`) holds only UI state that must survive navigation:

```tsx
const categoryFilter = useUiStore((state) => state.categoryFilter);
const setCategoryFilter = useUiStore((state) => state.setCategoryFilter);
```

- Select one field per hook call to avoid re-renders.
- Do not put server records, viewer data, or form values in Zustand.
- Dialog open state and form defaults stay local (`useState`, React Hook Form).

## Forms

The kit wraps React Hook Form's `Controller` and the shadcn `Field` primitives. All field components need the form's `control`.

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormInput } from "@/components/forms/form-input";
import { FormSelect } from "@/components/forms/form-select";
import { FormTextarea } from "@/components/forms/form-textarea";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().trim().min(2, "Give the tool a name.").max(80),
  category: z.enum(TOOL_CATEGORIES),
  description: z.string().trim().min(10).max(500),
});

type Values = z.infer<typeof schema>;

export function Example() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", category: "hand-tools", description: "" },
  });

  async function onSubmit(values: Values) {
    try {
      await createTool(values);
      form.reset();
      toast.success("Tool listed");
    } catch (error) {
      toast.error("Could not save the tool", { description: getErrorMessage(error) });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        control={form.control}
        name="name"
        label="Tool name"
        description="What would a neighbor search for?"
        placeholder="DeWalt 20V drill"
        required
      />
      <FormSelect control={form.control} name="category" label="Category" options={options} />
      <FormTextarea
        control={form.control}
        name="description"
        label="Description"
        hint="Up to 500 characters."
      />
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Save
      </Button>
    </form>
  );
}
```

Available fields:

| Component       | Notes                                                     |
| --------------- | --------------------------------------------------------- |
| `FormInput`     | `startIcon`, `endIcon`, `showPasswordToggle`, `clearable` |
| `FormTextarea`  | auto-resize-friendly, description/hint/error slots        |
| `FormSelect`    | options with optional icons; Radix select                 |
| `FormCheckbox`  | inline label + description                                |
| `FormDateRange` | popover calendar range; ISO `YYYY-MM-DD` values           |

Every field supports `label`, `description` (above the control), `hint` (below), `required`, `optional`, and renders validation errors with `aria-invalid` + `aria-describedby` through `useFieldIds`. Do not duplicate those IDs by hand.

Add validation copy that says what to do (“Add at least 10 characters…”, not “Invalid”). Server-side validation still runs; the client schema is for speed, not trust.

## Dialogs and destructive actions

- `Dialog` for create/edit flows; keep the trigger and form in the same client component.
- `ConfirmDialog` (`src/components/confirm-dialog.tsx`) for remove/decline/return confirmations. It exposes `title`, `description`, `confirmLabel`, `onConfirm`, and pending state.
- Destructive buttons use the `destructive` variant; neutral cancel is `outline` or `ghost`.
- Always disable the confirm button while the mutation is in flight, and keep the dialog open if the mutation fails.

## Navigation and gates

- `src/config/navigation.ts` is the only navigation registry. `PRIMARY_NAV`, `ADMIN_NAV`, and `enabledNav()` respect `FEATURES`.
- `AdminGuard` handles the in-app “administrators only” state; the backend still rejects non-admin mutations. Never rely on the guard for security.
- `AppShell` renders desktop sidebar + mobile sheet from the same registry. New pages need a nav item only if they are top-level destinations.

## Shared components worth knowing

| Component                   | Use                                                      |
| --------------------------- | -------------------------------------------------------- |
| `ToolCard`                  | Tool summary, owner, availability, condition, actions    |
| `RequestCard`               | Request summary with status badge and role-aware actions |
| `RequestActions`            | Approve/decline/cancel/return buttons with confirmations |
| `AutomationTimeline`        | Delivery events on admin automation and request detail   |
| `StatusBadge` / `ToneBadge` | Consistent status colors; map via `src/lib/status.ts`    |
| `UserAvatar`                | Initials/image fallback                                  |
| `ToolCardSkeleton` etc.     | Loading states                                           |

Prefer composing these over duplicating card markup. If a variant is needed, add a prop or a variant in the shared component, not a fork.

## Error handling

- Backend expected errors are `ConvexError` with `{ code, message }`; `getErrorMessage` extracts a safe message.
- Unexpected errors should show a generic toast and be logged by Convex. Do not render raw stack traces.
- Mutation failures must leave the UI in a recoverable state (dialog open, button re-enabled, optimistic UI avoided).
- `AppGate` already handles provisioning failures with a retry; features can assume the viewer exists.

## Accessibility

- Label every input; the form kit does this for you. Icon-only buttons need `aria-label`.
- Use `aria-live` for async status only when the same information is not already a toast.
- Dialogs: use the shadcn `Dialog`/`AlertDialog` primitives so focus trapping and Escape work.
- Keep focus visible: use `focus-visible:` classes from existing buttons/inputs; do not remove outlines.
- Color is never the only signal — status badges include text.
- Respect reduced motion: `tw-animate-css` utilities already degrade; avoid long custom animations.
- Test keyboard flow for new dialogs (Tab, Escape, Enter).

## Testing the UI

- Pure helpers → `tests/unit`.
- Form kit behavior → Testing Library with `userEvent`; see `tests/ui/form-input.test.tsx`.
- Feature views are covered indirectly through the backend RBAC tests; add component tests only for logic that is not exercised by the server tests (filters, derived labels).
- Write tests against roles/labels, not CSS classes.

## Definition of done

- Loading, empty, error, and forbidden states are all considered.
- Mutations surface success and failure with toasts.
- Forms validate on the client and the server; error copy is actionable.
- Works in light and dark mode, at mobile and desktop widths, with keyboard only.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm verify:isolation` pass.
- New files follow the feature folder structure; `index.ts` is updated only for the feature's public API.
