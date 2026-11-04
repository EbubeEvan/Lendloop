# Design guide

LendLoop should feel like a good neighborhood noticeboard: warm, legible, and a little tactile — not a generic SaaS dashboard. This document records the visual decisions already implemented so new screens match.

## Principles

1. **Warm utility.** Cream paper, deep garden green, and a small ochre accent. The interface stays calm; the tools and people are the color.
2. **One clear next action per screen.** The page header names the job, one primary button performs it, secondary actions stay quiet.
3. **Show trust signals, not scores.** “Trusted lender”, condition, availability, and loan status are plain text badges. No gamification.
4. **Density with air.** Cards carry real information but breathe: rounded corners, 16–24px padding, generous line height.
5. **States are designed.** Loading, empty, error, and forbidden screens use the same card language as success screens.

## Color

All colors are defined as OKLCH tokens in `src/app/globals.css` and exposed through `@theme inline`. Components use semantic utilities (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`), never raw hex.

| Token              | Light intent            | Use                                        |
| ------------------ | ----------------------- | ------------------------------------------ |
| `background`       | warm off-white paper    | page background                            |
| `foreground`       | deep green-black        | primary text                               |
| `card` / `popover` | near-white              | surfaces, dialogs                          |
| `primary`          | deep garden green       | primary buttons, links, eyebrows, focus    |
| `secondary`        | pale sage               | quiet filled buttons, secondary surfaces   |
| `muted`            | warm grey-green         | restful backgrounds                        |
| `muted-foreground` | mid green-grey          | descriptions, metadata                     |
| `accent`           | warm ochre              | highlights, selected calendar days, alerts |
| `destructive`      | brick red               | destructive actions and errors             |
| `border` / `input` | low-contrast green-grey | hairlines and controls                     |
| `ring`             | primary green           | focus rings                                |

Status colors are fixed semantic pairs used by `ToneBadge`:

- **pending** → amber
- **approved / available** → emerald
- **declined** (shown as “Rejected”) → rose
- **cancelled** → stone
- **returned / on loan** → sky

Always pair color with a text label and, for status badges, a dot. Never communicate state by color alone.

### Dark mode

Dark mode is a full token swap, not an inversion: deep green-black background, lighter green primary, translucent borders (`white/12%`). Use `dark:` variants only for tone badges and illustrations; layout components should rely on tokens and switch automatically. Test both themes before calling a screen done.

## Typography

Two families, loaded with `next/font`:

- **Fraunces** (`font-display`) — headings, page titles, card titles, empty-state titles. Use `font-semibold`, tight tracking, and `text-balance` on multi-line headings.
- **Geist** (`font-sans`) — everything else: body, labels, buttons, metadata. Body text is antialiased with `ss01`/`cv11` features.

Scale in practice:

| Role           | Classes                                                          |
| -------------- | ---------------------------------------------------------------- |
| Page title     | `font-display text-3xl sm:text-4xl font-semibold tracking-tight` |
| Section title  | `font-display text-xl sm:text-2xl font-semibold`                 |
| Card title     | `font-display text-lg font-semibold`                             |
| Eyebrow        | `text-xs font-semibold uppercase tracking-[0.14em] text-primary` |
| Body           | `text-sm sm:text-base leading-relaxed text-muted-foreground`     |
| Metadata       | `text-xs text-muted-foreground`                                  |
| Button / label | `text-sm font-medium`                                            |

Rules:

- Eyebrows are one or two words (“Browse”, “Admin”, “Incoming”), never sentences.
- Headings are sentence case, not Title Case.
- Numbers in stats use the display face and `tabular-nums` where columns align.
- Do not use more than two weights per family.

## Space, shape, and depth

- Page container: `mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9`.
- Vertical rhythm between page sections: `gap-6` (24px); inside cards `gap-4`; label-to-control `gap-2`.
- Radius: base `--radius: 0.75rem`. Cards use `rounded-2xl`; dialogs `rounded-2xl`/`rounded-3xl`; pills and buttons are fully rounded or `rounded-lg` depending on the component.
- Borders do the heavy lifting. Shadows are reserved for dialogs and popovers (`shadow-xl shadow-black/5`); cards stay flat with `border-border`.
- Use `border-dashed` only for empty states and drop zones.
- Backgrounds may use `bg-card/60` and `bg-primary/10` for quiet emphasis; avoid gradients except the landing hero.

## Components

### Buttons

- One `default` (primary green) action per view. Everything else is `outline`, `secondary`, or `ghost`.
- Icon + label: icon first, `size-4`, gap `1.5–2`.
- Icon-only buttons require `aria-label` and a tooltip where the meaning is not obvious.
- Destructive actions use `variant="destructive"` and a confirmation dialog; never a bare red icon that fires immediately.
- Loading: `disabled` + `Loader2Icon animate-spin`, keep the label so width does not jump.

### Cards

Tool, request, and stat cards share one shape:

```
rounded-2xl border border-border bg-card p-5
```

- Header: title (display face) + status/availability badge on the right.
- Meta row: category, condition, owner, dates — small, muted, dot-separated.
- Footer actions align right on desktop, full-width stacked on mobile.
- Hover only on interactive cards (`hover:border-primary/30`, subtle), never on static information.

### Badges

Use `ToneBadge`, `RequestStatusBadge`, `AvailabilityBadge`, `ConditionBadge`, `TrustedBadge` from `src/components/status-badge.tsx`. They already encode light/dark palettes. Do not create a new badge palette for a new status; add it to `src/lib/status.ts`.

### Forms

- Labels sit above controls; required fields get a green asterisk, optional fields a quiet “Optional”.
- Description above the input explains why; hint below explains constraints; error replaces the hint in the destructive color.
- Inputs are `h-10`, `rounded-lg`, `border-input`, and get a 3px `ring-ring/50` on focus-visible.
- Group related fields with `space-y-4`; put the primary submit at the end, right-aligned on desktop.
- Error copy is specific and actionable.

### Dialogs

- Title in the display face, one-sentence description in muted text.
- Actions in the footer: cancel (outline/ghost) left, confirm (primary/destructive) right.
- Keep the dialog open while submitting; close only on success.
- On mobile the dialog should fit without horizontal scrolling; long forms scroll inside `DialogContent`.

### Empty states

`EmptyState` uses a dashed card, a primary-tinted icon tile, a display-face title, one sentence of guidance, and one action. Write empty copy that suggests the next step (“List your first tool”), not an apology.

### Navigation

- Desktop sidebar: quiet `bg-sidebar`, primary tint for the active item, no heavy shadows.
- Mobile: a sheet with the same items, triggered by a labelled menu button.
- Admin items only appear for admins and sit in their own group.
- Never duplicate navigation links in page bodies; use the header actions for local CTAs.

## Motion

- Motion is functional: dialogs fade/zoom in, sheets slide, skeletons pulse, buttons show pending spinners.
- Use `tw-animate-css` utilities and shadcn defaults. No parallax, no auto-playing carousels.
- Keep durations short (150–250ms) and avoid animating layout properties.
- Respect `prefers-reduced-motion`; the shared primitives already do.

## Iconography

- `lucide-react` only, `size-4` inline and `size-5` for standalone icon tiles.
- Icons support text; they never replace a label except for universally understood controls (close, search, menu) which still need `aria-label`.
- Category icons come from `CATEGORY_META` in `src/lib/categories.ts`; reuse them instead of picking new ones.

## Email design

The n8n emails mirror the app without external assets:

- 560px max width, system sans stack (email clients cannot load Geist reliably).
- Eyebrow in the accent color, display-like heading, one short paragraph, a single pill button.
- Inline styles only; no `<style>` blocks, no remote images.
- The button color matches `primary` (green) for request events and ochre for overdue reminders.
- Footer explains why the recipient got the message and that replies are not monitored.
- All interpolated values are HTML-escaped in the workflow Code nodes.

## Voice and copy

- Neighborly and direct: “What's on the block?”, “Borrow what you need. Lend what you don't.”
- Use plain verbs: borrow, lend, list, approve, reject, return. Avoid “utilize”, “leverage”, “platform”.
- Dates read like `Nov 12 → Nov 15`; relative time like “2 days overdue”.
- Errors say what happened and what to do next. Never blame the user.
- Empty states and confirmations are short; no exclamation marks, no emoji.

## Accessibility baseline

- Text contrast meets WCAG AA in both themes; muted text is for supporting copy only.
- Focus rings are always visible; never `outline-none` without a ring replacement.
- Touch targets are at least 40px tall (inputs are 40px, buttons `h-10` or `size-10`).
- Dialogs and sheets use Radix focus management; do not build custom modals.
- Tables on admin screens collapse to cards or scroll horizontally with a labelled region on mobile.
- Status changes announced with text (and a toast), not color alone.

## Do / don't

| Do                                                      | Don't                                      |
| ------------------------------------------------------- | ------------------------------------------ |
| Use `bg-card`, `text-muted-foreground`, `border-border` | Use `bg-[#f7f5ef]` or arbitrary hex values |
| Put one primary button per screen                       | Stack three filled green buttons           |
| Reuse `ToolCard` / `RequestCard`                        | Fork card markup for a single page         |
| Use `EmptyState` with a next step                       | Show a blank panel or “No data”            |
| Use the display face for headings only                  | Set whole paragraphs in Fraunces           |
| Pair status color with a label                          | Rely on a colored dot alone                |
| Keep descriptions to one or two sentences               | Write marketing paragraphs inside the app  |
| Check dark mode, mobile, and keyboard flow              | Ship a light-mode-only screen              |
