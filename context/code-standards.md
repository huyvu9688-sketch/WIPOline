# Code Standards

## General

- Keep modules small and single-purpose: data access
  (`lib/warehouse.ts`), mutation entry points
  (`app/warehouse/actions.ts`), and presentation
  (`components/*`) stay separate.
- Fix root causes, not symptoms — e.g. when stock numbers were
  wrong, the fix was syncing the real source file
  (`scripts/sync-onhand.mjs`), not patching individual JSON
  values by hand.
- Don't add abstractions ahead of need — three near-identical
  table components (`items-table`, `output-table`,
  `track-log-table`) is acceptable here since each has a
  genuinely different column set; don't force them into one
  generic table just to reduce line count.

## TypeScript

- `strict` mode throughout (see `tsconfig.json`).
- Avoid `any`; shared record shapes (`StockItem`,
  `WarehouseRecord`, `TrackLogRecord`) live in `lib/warehouse.ts`
  and are imported, not redeclared, by components/pages.
- Validate external/user input at the boundary: form data is
  parsed and validated once in `app/warehouse/actions.ts`
  (`parseInput`) before anything touches `lib/warehouse.ts`.

## Next.js (App Router)

- Pages default to server components; `"use client"` is added
  only where interactivity is required (tables with local
  search/pagination state, forms, the theme hotkey).
- Route pages read their JSON data at request time
  (`fs.readFileSync` via `lib/warehouse.ts`), never via a static
  `import ... from "./data.json"` — static imports would freeze
  the data at build time.
- Mutations are Server Actions (`"use server"` in
  `app/warehouse/actions.ts`), never client-side `fetch` to a
  hand-rolled API route.
- Every mutation calls `revalidatePath` for **every** route
  whose displayed data it affects, not just the page the form
  lives on (e.g. a withdrawal revalidates `/output`, `/items`,
  `/input`, `/wip`).

## Styling

- Use the shadcn/Tailwind semantic tokens (`bg-background`,
  `text-muted-foreground`, …) — no hardcoded hex/oklch values in
  components. See `ui-context.md` for the token table.
- Follow the border-radius scale defined in `globals.css`
  (`rounded-lg`, `rounded-xl`, …), not arbitrary values.

## Data and Storage

- No database. Metadata and stock state both live in
  `app/*/data.json`; keep it that way rather than introducing a
  database for a single-user internal tool.
- Large/authoritative data stays in the `.xlsx`/`.xlsb` files
  under `ref/`; scripts under `scripts/` derive the small JSON
  files the app actually reads from them. Never hand-edit a
  derived `data.json` file that a script can regenerate —
  fix the script or the source `ref/` file instead.
- Scripts resolve their input file from `ref/` dynamically
  (glob + latest mtime), since filenames change per export run.

## File Organization

- `app/<route>/` — one folder per page: `page.tsx` +
  `data.json` for that route's data.
- `app/warehouse/actions.ts` — all warehouse Server Actions.
- `app/login/` — login page, `loginAction`/`logoutAction`.
- `proxy.ts` (repo root) — Next 16's renamed `middleware.ts`;
  the route-level auth gate (see `architecture.md`).
- `lib/auth.ts` / `lib/users.json` — user accounts, password
  hashing, role→route access rules. `lib/session.ts` — JWT
  session cookie sign/verify. `lib/get-session.ts` —
  Server Component/Action helper (`getSession`/`requireSession`);
  not usable from `proxy.ts` (no `next/headers` there).
- `lib/` — framework-free data access/mutation logic.
- `components/` — shared feature components; `components/ui/`
  is shadcn-generated — regenerate via the shadcn CLI rather
  than hand-editing, and treat it as a protected path (see
  `ai-workflow-rules.md`).
- `scripts/` — one-off Node scripts (`node scripts/x.mjs` /
  `npm run <name>`) that regenerate `app/*/data.json` from
  `ref/` exports.
- `ref/` — source-of-truth Excel/xlsb exports, not app code.
- `context/` — this spec/progress documentation set.
