<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Codebase Conventions (inspected — treat as source of truth)

## Stack
- **Next.js 16.3.0** (App Router), **React 19**, TS. `next dev`/`next build` via Turbopack.
- **Use `bun` (not npm)** for installs — the repo runs on `bun.lock` (no `package-lock.json`) and the Dockerfile does `bun install --frozen-lockfile`. `bun add <pkg>` / `bun add -d <pkg>`.
- **shadcn/base-nova style** built on **`@base-ui/react`** (NOT Radix). Primitives live in `src/components/ui/` and are the ONLY sanctioned UI building blocks — do not reach for other component libs.
- Styling is **Tailwind v4** + `cn()` from `@/lib/utils` (clsx + tailwind-merge). No `tailwind.config.js` (v4 CSS-based). Icons via **lucide-react** (imported by name; latest renamed: `ClipboardPen` not `ClipboardPencil`, `Ruler` not `RulerMeasure`).
- Available ui primitives: `avatar, badge, button, card, dialog, dropdown-menu, input, label, popover, select, separator, sheet, sidebar, skeleton, sonner, table, tabs, tooltip, alert, subject-icon`.
- `components.json`: aliases `@/components`, `@/components/ui`, `@/lib`, `@/hooks`; iconLibrary `lucide`.

## Component patterns (match these exactly)
- React Server Components by default; add `"use client"` ONLY when needed (state/effects/interactivity).
- Base-ui interaction patterns:
  - **Dropdown/Tooltip/Select/Dialog triggers use the `render` prop for styling a `Button`**, NOT `asChild`.
  - **`Select`/`DropdownMenu` `onValueChange` param is typed `unknown` → wrap with `String(v)`** (e.g. `onValueChange={(v) => setX(String(v))}`).
  - `Button` rendering a `<Link>` via `render` needs `nativeButton={false}` to avoid a console error.
- **Client components must NOT import `next/headers` transitively** (causes a Pages-Router build error). Server-only logic goes in separate modules (e.g. `lib/api/admin-server.ts`, `lib/api/auth.ts`); client-safe functions in their own module (e.g. `lib/api/auth-client.ts`).
- Small local helpers (date formatting, `errorMessage(err)`, `initials`) are defined as module-level functions inside the same file.
- **User avatars = `UserAvatar`** (`components/layout/user-avatar.tsx`, built on the shadcn/base-ui `ui/avatar` primitives — `Avatar` + `AvatarImage` + `AvatarFallback`). It serves the Gravatar (`md5` of lowercase email via `blueimp-md5`, URL `https://www.gravatar.com/avatar/{hash}?s=96&d=404&r=g`); `d=404` makes a user without a Gravatar fall back to the initials letter block automatically (base-ui keeps the fallback on image error). Use it instead of hand-rolling `Avatar`+`AvatarFallback` for users. It accepts `size` (`sm`/`default`/`lg`), `className` (root) and `fallbackClassName`.

## Card layout (use the built-in slots)
`Card` uses slot primitives. For an action button in a card header use **`CardAction`** (renders `justify-self-end` in the header grid) — do NOT hand-roll flex layouts inside `CardHeader`:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Desc</CardDescription>
    <CardAction>
      <Button variant="ghost" size="icon-sm" className="hover:bg-foreground/10!" ...>
        <Pencil className="size-3.5" />
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```
- Icon button conventions: `variant="ghost" size="icon-sm" className="hover:bg-foreground/10!"` with `size-3.5` lucide icon; `size="icon-lg"` = 36px; `icon-sm` = 28px.
- Regular buttons put a leading lucide icon + `gap-1.5`; loading spinners use `Loader2 className="size-4 animate-spin"`.

## Spacing & layout
- Sections/rows: `flex flex-col gap-3`/`gap-4`; item rows `flex items-center gap-1.5`/`gap-2`/`gap-2.5`. `gap-1` is tight, avoid.
- Lists/page gaps: `flex flex-col gap-4`; card grids: `grid gap-4 lg:grid-cols-2 items-start`.
- Icon sizing near text: `size-3.5` (small context) or `size-4` (standalone/header).

## Tables
`Table` is renderless-wrapped in a `overflow-x-auto` container. Empty state = one `TableRow` with a single `TableCell` `colSpan={N}` `className="py-12 text-center text-sm text-muted-foreground"`. Table block wrapped in `<div className="rounded-lg border border-border bg-background">`.

## Dialogs & forms
- **`input type="time"`**: below `md`, iOS renders these at an intrinsic width that runs past the dialog's right edge (`max-width`/`min-width:auto` lets the box overflow). `globals.css` `@media (max-width: 767px)` sets `appearance: none` (plain `HH:MM` text, native picker on tap) **and `width/max-width: 100%`, `min-width: 0`** so the box can never exceed the popup. Keep this rule; don't restyle time inputs with fixed pixel widths. For full datetimes use `DateTimePicker` from `@/components/ui/date-time-picker`.
- Controlled `Dialog` (base-ui) with `DialogContent` → `form` (`flex flex-col gap-4`) → `DialogHeader` (`DialogTitle`+`DialogDescription`) → fields (`<div className="flex flex-col gap-1.5">` with `<Label>`+`<Input>`) → inline error `<p>` → submit `<Button type="submit" disabled={loading} className="gap-1.5">` with `Loader2` spinner. Reset state on close via a `handleOpenChange` that resets on `!next`.
- Errors surface 2 ways: inline red box `className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2"`, or `sonner` `toast.success()/toast.error()` (mounted in root `app/layout.tsx`).

## Data fetching
- Client data uses `apiFetch<T>(path, { method, body })` from `@/lib/api/client`; throws `ApiError`. Read backend message via `(err as { body?: { message?: string } }).body?.message`.
- Server data (`getCurrentUser`, admin fetch) uses `@/lib/api/server-client` (`serverApiFetch`) — server-only.
- `SubjectIcon` (render subject icons): use `getSubjectIcon(icon)`/`SUBJECT_ICONS` from `@/lib/icons`, or `<SubjectIcon icon size />` from `@/components/ui/subject-icon`.

## Routing & auth
- `(app)` layout gates on `user.email_verified` (admins exempt) → redirect to `/auth/verify/pending`.
- Scroll pattern: `SidebarInset overflow-hidden!` → the page content root must be its own scroll container: `min-h-0 flex-1 overflow-y-auto` (used in `/admin`, settings, etc.).

## Mobile UI & PWA framework
- **Breakpoint:** `useIsMobile()` (`<768px`, `hooks/use-mobile.ts`) flips the sidebar into a `Sheet` drawer (`ui/sidebar.tsx`). Desktop = `md+`. Match this with `max-md:`/`md:` variants — never invent other breakpoints.
- **AppBar:** `(app)/layout.tsx` renders `<AppBar />` (`components/layout/app-bar.tsx`) — mobile-only (`md:hidden`) top bar with hamburger (`SidebarTrigger`) and the current section title (derived from `lib/navigation.ts` + `/admin`/`/settings`). No avatar/actions in it — the user menu lives only in the sidebar footer. Apply `pt-[env(safe-area-inset-top)]` if you touch it.
- **Drawer auto-close:** every nav element *inside* the drawer closes it on click via `setOpenMobile(false)` (`app-sidebar.tsx` `handleNavigate`, `user-menu.tsx` `closeDrawer`). If you add navigation inside the drawer, close it the same way.
- **Page layout rule:** each `(app)` page is its own scroll container — outer `min-h-0 flex-1 overflow-y-auto`, inner content `px-4 pb-4 md:px-8 md:pb-6`. Never hard-code `px-8` at all breakpoints. `PageHeader` handles its own responsive padding/type.
- **Toolbars/filters:** always `flex-wrap` + fluid widths (`w-full sm:w-32`, etc.). No control may be fixed-width wider than ~320px.
- **Tables:** already mobile-safe (primitive wraps in `overflow-x-auto` + `whitespace-nowrap`) — do not remove that wrapper.
- **Calendar** (`calendar-week-view.tsx`): **desktop (`md+`) is the ORIGINAL single-scroller design** — a static (non-scrolling) day-header row and one `scrollDesktopRef` vertical scroller with the hour gutter in-flow next to the columns. The scroller carries `no-scrollbar`, so desktop shows **zero visible scrollbars** (it still scrolls with wheel/trackpad). Do not give the desktop calendar panes, extra scroll containers, or a visible scrollbar. **Mobile (`max-md:`) is a SINGLE-DAY view** (one day column filling the width, header shows that day only) — horizontal scrolling is LOCKED (`overflow-x-hidden` on the grid, `overflow-hidden` on the header); navigation is day-by-day via the top arrows (`mobileDayOffset`, state in the component) with a "Today" button to reset. The hour gutter (`gutterScrollRef`, vertical only) and the main grid (`scrollMobileRef`) still sync scrollTop via `syncGridScroll`, and the header pane keeps `headerScrollRef` (no horizontal sync needed anymore). Both layouts share `renderHourLabels()` and `renderDayCell(day)` (desktop maps it over `weekDays`, mobile calls it with `mobileDay`). Do NOT reintroduce `position: sticky left` — iOS Safari doesn't freeze it during two-axis touch panning (that was the bug). Click→time math must stay `e.clientY - rect.top` (rect already includes scroll) — do not add `scrollTop` back. The initial scroll-to-first-class effect runs **once per week** (guarded by `scrolledWeekRef`) and targets both the desktop and mobile scrollers. Gutter pane carries `no-scrollbar` (a custom `@utility` in `globals.css`).
- **Calendar page** (`(app)/calendar/page.tsx`): the `PageHeader` (title + description) shows on ALL breakpoints, and the sync hint (`calendar-sync-hint.tsx`, a controlled tooltip so it's tappable) is absolutely positioned top-right over the desktop header and a right-aligned row under it on mobile.
- **Touch targets:** ≥ `size-9` (36px) for bar icons; drawer/menu rows are 40px+.
- **Safe areas:** any surface touching the notch or home indicator adds `env(safe-area-inset-*)`, scoped with `max-md:` so desktop is untouched. Dialogs use `max-md:max-h-[calc(100dvh-2rem)] max-md:overflow-y-auto` so tall forms scroll (keep this when editing `ui/dialog.tsx`).
- **Toaster:** `ui/sonner.tsx` shows toasts `top-right` on desktop, `top-center` (`offset: 64` to clear the AppBar) on mobile.
- **PWA groundwork (in place, keep compatible):** `app/layout.tsx` exports `viewport` (`width: device-width`, `viewportFit: cover`, `themeColor`) + `metadata.appleWebApp`; `app/manifest.ts` provides name/icons/theme. A service worker is intentionally NOT installed yet — future PWA work (installability, offline, icons at 192/512) must preserve these files.

## Dev server access from other devices
- `next dev` already listens on all interfaces (`hostname` unset). Next additionally blocks cross-site requests to `/_next*`, `/__nextjs*`, and HMR websockets unless the request host is in `allowedDevOrigins` (see `node_modules/next/dist/server/lib/router-utils/block-cross-site-dev.js` — exact match or `*`/`**` subdomain wildcards; no `*`-alone or `*.tld` wildcards, no CIDR).
- `next.config.ts` sets `allowedDevOrigins` to every non-internal network interface address — so a phone on the same Wi-Fi just opens the `Network:` URL the dev server prints, zero config. This is LAN-only by design: do not add remote/tunnel hosts. Removed quirks: bare `0.0.0.0` does nothing (it only matches Host header `0.0.0.0`), don't re-add it.

## Lint rules to satisfy (eslint-config-next + ts types)
- `react-hooks/static-components`: NEVER create a component via a function call during render (e.g. `const Icon = getSubjectIcon(x); <Icon/>`). Use module-stable lookups (`SUBJECT_ICONS[x] ?? DEFAULT`) or a dedicated module-level presentational component.
- `react-hooks/set-state-in-effect`: don't call `setState` synchronously in a `useEffect` body — use `loading=true` initial + async `.then/.finally`.
- `react-hooks/use-memo`: if required, use the inline function-expression form.
- No forward refs / no `useMemo`-wrapped component definitions.

## Icon picker (subject) guidelines
- Grid inside a dropdown: wide content (`w-64`), 4 columns, `gap-3`, each button `size-10 p-0! rounded-lg`, icon `size-5`, with `pr-2` on the scroll container so the scrollbar doesn't cover icons.
- Wrap `DropdownMenuLabel` in `DropdownMenuGroup` (base-ui requires it inside a Group).
