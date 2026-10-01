# Architecture Context

## Stack

| Layer     | Technology                          | Role                                   |
| --------- | ------------------------------------ | --------------------------------------- |
| Framework | Next.js 16 (App Router) + TypeScript | Pages, server actions, SSR              |
| UI        | Tailwind CSS v4 + shadcn/ui          | Components, tables, forms               |
| Sidebar   | `@base-ui/react`                     | `Select`, `Autocomplete`, sidebar primitives |
| Charts    | recharts                             | Dashboard cards                         |
| Excel I/O | `xlsx` (SheetJS)                     | Reads `.xlsx`/`.xlsb` exports in `ref/` |
| Database  | None                                 | Flat JSON files under `app/*/data.json` |

## System Boundaries

- `app/*/page.tsx` — one route per feature (`dashboard`,
  `items`, `wip`, `input`, `output`); each reads its own
  `data.json` at request time via `node:fs`, never a static
  import, so it always reflects the latest on-disk state.
- `app/*/data.json` — the actual data store per route. `items`
  is the item master + current on-hand stock; `input`/`output`
  are append-only transaction logs (but see the Output caveat
  below).
- `app/warehouse/actions.ts` — `'use server'` Server Actions
  (`withdrawStockAction`, `receiveStockAction`,
  `createRequestAction`, `markRequestReadyAction`,
  `confirmPickupAction`) that validate form input and call into
  `lib/warehouse.ts`, then `revalidatePath` every route affected
  by the mutation.
- `lib/warehouse.ts` — pure read/validate/write functions over
  the JSON files (`readItems`, `readInputRecords`,
  `readOutputRecords`, `readTrackLog`, `withdrawFromWarehouse`,
  `receiveIntoWarehouse`, `readRequests`, `createRequest`,
  `markRequestReady`, `confirmRequestPickup`). No React/Next
  imports — reusable and testable outside a request.
- `components/*-table.tsx` — client components (search, filter,
  pagination) that render whatever array of rows their page
  passes in; they do not fetch data themselves.
  `components/requests-table.tsx` additionally embeds per-row
  Server Action forms (`MarkReadyAction`/`ConfirmPickupAction`,
  each its own `useActionState`) for the pending/ready row
  actions — the only table with row-level mutations rather than
  pure display.
- `components/request-form-card.tsx` — the `/request` request
  form (item, quantity, line, requester name), mirroring
  `warehouse-transaction-card.tsx`'s shape but posting to
  `createRequestAction` instead of a direct withdraw/receive.
  Keeps the typed item number and quantity in state (via
  `item-number-field.tsx`'s now-controllable `value`/
  `onValueChange`) purely to render a client-side green/amber/red
  stock-availability line under Quantity — this is a UX hint only,
  not validation; `createRequestAction` still doesn't check stock
  (a request can be made against an item with 0 on hand).
- `scripts/*.mjs` — one-off Node scripts run manually via `npm
  run <script>` to regenerate JSON from the Excel/xlsb files in
  `ref/`. Never run automatically by `next build`/`next dev`.
- `ref/` — source-of-truth Excel/xlsb exports from the plant's
  own systems (item master, production print, on-hand-by-location).
  Filenames change per run; scripts resolve the latest one by
  glob + mtime, never hardcode a filename.
- `app/plant/` — **Warehouse Plan** (`/plant`), a mostly-stateless
  system boundary that does not touch any of the above data — with
  one exception (see below). `app/plant/page.tsx` renders
  `components/plant-uploader.tsx`, which posts an uploaded
  `.xlsx`/`.xlsb` file to the `processPlantFileAction` Server
  Action in `app/plant/actions.ts`. That action calls into
  `lib/plant.ts` (pure parsing/classification/split logic, no
  React/Next imports, same convention as `lib/warehouse.ts`) and
  returns a capped preview plus base64-encoded `.xlsx` buffers for
  client-side download — none of *that* is written to disk. The one
  exception: the action also calls `buildDemandFromMobomRows()`
  (`lib/plant.ts`) and `replaceDemand()` (`lib/warehouse.ts`) to
  regenerate `app/output/demand.json` from the same upload — see
  CLAUDE.md's "Output data" section. See `progress-tracker.md`'s
  "Warehouse Plant page" entry for the classification/split rules
  and their verification status.

## Storage Model

- **`app/items/data.json`**: item master (item number,
  description, material, sup-team) **plus** current on-hand
  `quantity`/`unit` — this file is both reference data and live
  stock state, mutated directly by `lib/warehouse.ts`.
- **`app/input/data.json`**: append-only log of receive
  transactions (`date`, `type: "in"`, item, quantity, unit).
- **`app/output/data.json`**: append-only log of withdraw
  transactions (`date`, `type: "out"`, item, quantity, unit),
  written only by `withdrawFromWarehouse`.
- **`app/output/requests.json`**: production's requests to the
  warehouse (`WarehouseRequest[]`) — item, quantity, `line`,
  `requesterName`, `receiverName`, and `status`
  (`pending`/`ready`/`picked_up`) with timestamps for each
  transition. Written by `createRequest`/`markRequestReady`/
  `confirmRequestPickup` in `lib/warehouse.ts`. Only
  `confirmRequestPickup` touches stock (via
  `withdrawFromWarehouse`) — `pending`/`ready` never do.
- **`app/output/demand.json`**: aggregated *production
  requirement* (`QTREQ`) per item from the latest MSS print,
  fully overwritten by `npm run build:output`. Not part of the
  track log or stock, but `withdrawFromWarehouse` counts a
  withdrawal's quantity down against the matching item's demand
  (floored at 0) — so it reads as "remaining requirement", not a
  fixed figure. `npm run build:output` resets it to the full
  requirement from whatever MSS print is latest at the time,
  discarding any countdown so far. Read via `readDemand()` /
  `reduceDemand()` and shown in its own section on `/output`.
- No blob/file storage beyond the above — everything is small
  JSON, read/written whole-file with `fs.readFileSync`/`writeFileSync`.
- **`/plant` has no storage at all** — by design. Each upload is
  parsed and split fully in memory per request; nothing is written
  to `ref/`, `app/*/data.json`, or any other file. This is
  deliberately different from every other route above.

## Auth and Access Model

- Cookie-session login (`app/login/`), added 2026-09-29. 12
  accounts in `lib/users.json` (scrypt-hashed passwords):
  `admin`, `warehouse`, `line1`…`line10`. Sup-team "Nguyen, Thi
  Dung" is still hardcoded per item, unrelated to login.
- `lib/session.ts` signs/verifies a JWT (via `jose`, HS256, secret
  from `AUTH_SECRET` env var) stored in an httpOnly `session`
  cookie set by `app/login/actions.ts`'s `loginAction`. No
  expiry — session lasts until `logoutAction` clears the cookie.
- `proxy.ts` (Next 16's renamed `middleware.ts`) is the route
  gate: verifies the cookie on every request and enforces
  `canAccessPath()` (`lib/auth.ts`), redirecting to `/login` (no
  session) or the caller's role home (`homeForRole()`) if the
  role can't reach that path.
- Roles: `admin` (every route), `warehouse` (every route except
  `/request` — fulfills requests on `/output` but doesn't submit
  them — plus `/plant`), `line` (only `/request`, scoped to that
  account's own `line` value; can't reach any other route).
- Defense in depth: every mutating Server Action in
  `app/warehouse/actions.ts` re-checks the role itself (via
  `requireSession()`/`getSession()`) rather than trusting
  `proxy.ts` alone — Next's own proxy docs warn a matcher change
  can silently stop covering a route, and Server Functions are
  POSTs to their page's route so they ride along with whatever
  that route's proxy coverage is.

## Invariants

1. Route pages never statically `import` a `data.json` for data
   that can change at runtime — always read via `lib/warehouse.ts`
   (or `fs`) at request time.
2. Mutations only happen through `lib/warehouse.ts` functions
   called from `app/warehouse/actions.ts` Server Actions — no
   component writes to a JSON file directly.
3. Every mutation that changes stock must `revalidatePath` every
   route whose data it affects (`/items`, `/wip`, `/input`,
   `/output`) so a single round trip shows current data everywhere.
4. Scripts under `scripts/` resolve their input file from `ref/`
   dynamically (latest mtime matching a pattern) — never a
   hardcoded filename, since export filenames change per run.
5. `components/items-table.tsx` is shared between `/items` (item
   master, no stock shown — `showStock={false}`) and `/wip`
   (stock shown) — keep it that way rather than forking a second
   table component.
6. A `WarehouseRequest` only ever moves forward through
   `pending` → `ready` → `picked_up` (`createRequest` →
   `markRequestReady` → `confirmRequestPickup`); each function
   rejects a request not in the expected prior status. Stock is
   touched only at `confirmRequestPickup`, via the existing
   `withdrawFromWarehouse` — never at `pending` or `ready`.
