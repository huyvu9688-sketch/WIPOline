# UI Context

## Theme

Light theme by default with a dark mode class (`next-themes`,
`attribute="class"`, `defaultTheme="system"`). Neutral,
low-saturation palette (oklch grays with a faint warm tint) —
a plain internal data-entry tool, not a branded product. Press
`d` anywhere outside a text field to toggle dark/light
(`components/theme-provider.tsx`).

## Colors

Tokens are defined as CSS custom properties in `app/globals.css`
(`:root` for light, `.dark` for dark) using `oklch()`, then
mapped into Tailwind via the `@theme inline` block. Always use
the Tailwind/shadcn semantic classes (`bg-background`,
`text-muted-foreground`, `bg-sidebar`, etc.) — never hardcode a
hex or oklch value in a component.

| Role         | CSS Variable    | Tailwind class            |
| ------------ | --------------- | -------------------------- |
| Page bg      | `--background`  | `bg-background`            |
| Card/surface | `--card`        | `bg-card`                  |
| Primary text | `--foreground`  | `text-foreground`          |
| Muted text   | `--muted-foreground` | `text-muted-foreground` |
| Border       | `--border`      | `border`                   |
| Destructive  | `--destructive` | `text-destructive`         |
| Sidebar      | `--sidebar`     | `bg-sidebar`                |

## Typography

Default Next.js font setup (`--font-sans` mapped to
`--font-heading` too — no separate display font). No monospace
usage identified in-app; not a code-focused surface.

## Border Radius

Driven by a single `--radius` token (`0.625rem`), scaled via
`--radius-sm` … `--radius-4xl` in `globals.css`. Use the
Tailwind radius classes (`rounded-lg`, `rounded-xl`, …) rather
than a literal `rounded-[10px]`.

## Component Library

shadcn/ui on top of Tailwind v4, with `@base-ui/react` backing
some primitives directly (`Select`, `Autocomplete`, sidebar).
Components live in `components/ui/`. Feature components
(`items-table.tsx`, `track-log-table.tsx`, etc.) compose these
rather than reimplementing table/form primitives.

## Layout Patterns

- Every page: `SidebarProvider` > `AppSidebar` (`variant="inset"`)
  + `SidebarInset` > `SiteHeader title="..."` + page content —
  copy this shell from an existing `app/*/page.tsx` for new routes.
- Sidebar: collapsible, offcanvas, fixed set of nav items in
  `components/app-sidebar.tsx` (`navMain` array) rendered by
  `nav-main.tsx` with active-route highlighting via `usePathname`.
- Data pages: an optional action card at the top
  (`warehouse-transaction-card.tsx`) followed by a
  search/filter/paginated table (`*-table.tsx`), all inside
  `@container/main` + consistent `px-4 lg:px-6` gutters.
- Tables: all follow the same shape — search input + a
  `Select` filter row, a bordered `Table`, then a rows-per-page
  `Select` + first/prev/next/last pagination buttons. Copy this
  structure rather than inventing a new pagination pattern.

## Icons

`lucide-react`. One icon per nav item/section, no fill variants
used. Sized implicitly via the sidebar/button component (no
manual `h-4 w-4` overrides seen outside those primitives).
