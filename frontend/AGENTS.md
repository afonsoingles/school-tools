<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Codebase Conventions (inspected — treat as source of truth)

## Stack
- **Next.js 16.3.0** (App Router), **React 19**, TS. `next dev`/`next build` via Turbopack.
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
- Controlled `Dialog` (base-ui) with `DialogContent` → `form` (`flex flex-col gap-4`) → `DialogHeader` (`DialogTitle`+`DialogDescription`) → fields (`<div className="flex flex-col gap-1.5">` with `<Label>`+`<Input>`) → inline error `<p>` → submit `<Button type="submit" disabled={loading} className="gap-1.5">` with `Loader2` spinner. Reset state on close via a `handleOpenChange` that resets on `!next`.
- Errors surface 2 ways: inline red box `className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2"`, or `sonner` `toast.success()/toast.error()` (mounted in root `app/layout.tsx`).

## Data fetching
- Client data uses `apiFetch<T>(path, { method, body })` from `@/lib/api/client`; throws `ApiError`. Read backend message via `(err as { body?: { message?: string } }).body?.message`.
- Server data (`getCurrentUser`, admin fetch) uses `@/lib/api/server-client` (`serverApiFetch`) — server-only.
- `SubjectIcon` (render subject icons): use `getSubjectIcon(icon)`/`SUBJECT_ICONS` from `@/lib/icons`, or `<SubjectIcon icon size />` from `@/components/ui/subject-icon`.

## Routing & auth
- `(app)` layout gates on `user.email_verified` (admins exempt) → redirect to `/auth/verify/pending`.
- Scroll pattern: `SidebarInset overflow-hidden!` → the page content root must be its own scroll container: `min-h-0 flex-1 overflow-y-auto` (used in `/admin`, settings, etc.).

## Lint rules to satisfy (eslint-config-next + ts types)
- `react-hooks/static-components`: NEVER create a component via a function call during render (e.g. `const Icon = getSubjectIcon(x); <Icon/>`). Use module-stable lookups (`SUBJECT_ICONS[x] ?? DEFAULT`) or a dedicated module-level presentational component.
- `react-hooks/set-state-in-effect`: don't call `setState` synchronously in a `useEffect` body — use `loading=true` initial + async `.then/.finally`.
- `react-hooks/use-memo`: if required, use the inline function-expression form.
- No forward refs / no `useMemo`-wrapped component definitions.

## Icon picker (subject) guidelines
- Grid inside a dropdown: wide content (`w-64`), 4 columns, `gap-3`, each button `size-10 p-0! rounded-lg`, icon `size-5`, with `pr-2` on the scroll container so the scrollbar doesn't cover icons.
- Wrap `DropdownMenuLabel` in `DropdownMenuGroup` (base-ui requires it inside a Group).
