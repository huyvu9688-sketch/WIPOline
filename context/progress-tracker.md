# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress

## Current Goal

- Give warehouse staff an accurate, always-current on-hand
  view (WIP) fed from the plant's real `OH-LLOCN.xlsb` export,
  with Input/Output as the transaction entry points and a
  combined daily track log for history.

## Completed

- **Item list page** (`/items`): parses `ref/item_nhập_kho.md`
  into `app/items/data.json` (1587 items: item number,
  description, material, sup-team). Searchable/filterable
  table at `components/items-table.tsx`.
- **Output page** (`/output`): parses the latest
  `ref/MSS-*.xlsb` production print file's `MOBOM` sheet,
  matches each `CITEM` against `app/items/data.json`, and
  sums `QTREQ` (quantity) per item with its `UNMSR` (unit).
  Result written to `app/output/data.json` (302 items for
  the `MSS-0927 -1004-1011   WN3 Print.xlsb` run). Table at
  `components/output-table.tsx`.
- Sidebar (`components/app-sidebar.tsx`, `nav-main.tsx`) now
  has real routed links with active-state highlighting:
  Dashboard, Item list, Output.
- `components/site-header.tsx` takes a `title` prop so each
  page can set its own header text.
- **Warehouse stock tracking**: `app/items/data.json` now
  carries `quantity`/`unit` per item (current stock on hand,
  all seeded at 0 — no real starting-stock source existed).
  Shown as new Stock/Unit columns in `components/items-table.tsx`.
- **Get from warehouse** card on `/output`
  (`components/warehouse-transaction-card.tsx`, variant
  `withdraw`): enter item number + quantity to withdraw stock.
  Decrements the item's `quantity` and appends a row to
  `app/output/data.json`. Table pushed down below the card.
- **Input page** (`/input`, new): `app/input/page.tsx`,
  `app/input/data.json`, `components/input-table.tsx`. Mirrors
  Output but for receiving stock — "Add to warehouse" card
  (variant `receive`) increments the item's `quantity` and
  appends a row to `app/input/data.json`. Added to the sidebar
  between Output and Lifecycle (`PackagePlusIcon`).
- Both transaction cards use an **item-number autocomplete**
  (`components/item-number-field.tsx`, built on
  `components/ui/autocomplete.tsx` wrapping `@base-ui/react`'s
  `Autocomplete`) instead of a free-text input — suggests
  matching item numbers/descriptions while typing, so staff
  pick a real item instead of mistyping one.
- Mutations are **Server Actions**
  (`app/warehouse/actions.ts` → `lib/warehouse.ts`):
  `withdrawStockAction` / `receiveStockAction` validate input,
  read/write the JSON files on disk with `node:fs`, and call
  `revalidatePath` so the affected pages reflect the change on
  the same round trip. `/items`, `/output`, `/input` pages read
  their JSON via `fs.readFileSync` at request time now (not a
  static `import`), so they always show current data.

- **WIP page** (`/wip`, new): shows current on-hand
  `quantity`/`unit` per item, reusing `components/items-table.tsx`
  with a new `showStock` prop (default `true`). Added to the
  sidebar between Item list and Output.
- **Item list no longer shows stock**: `/items` now renders
  `<ItemsTable data={data} showStock={false} />` — it's a pure
  item-master reference; WIP is the stock view now.
- **Track log** replaces the raw withdrawal table on `/output`:
  `components/track-log-table.tsx` renders `lib/warehouse.ts`'s
  new `readTrackLog()` (merges `input`/`output` records, sorted
  by `date` desc), with a Date column and an In/Out type badge.
  `WarehouseRecord` gained `date`/`type` fields, set by
  `withdrawFromWarehouse`/`receiveIntoWarehouse` on every new
  transaction. Pre-existing records (seeded before this change,
  including the script-generated production-demand rows in
  `app/output/data.json`) show `date: "—"` since they predate
  the field.
- **On-hand sync from real data**: added
  `scripts/sync-onhand.mjs` (`npm run sync:onhand`). Discovered
  `app/items/data.json` was almost entirely placeholder data —
  1585 of 1587 items had `quantity: 0, unit: "EA"` (the two
  non-zero entries were just manual test transactions from this
  session). The script sums `LQNTY` per item across all
  locations in `ref/OH-LLOCN.xlsb`'s `Data1` sheet and writes it
  into `items.quantity`, and fixes unit-of-measure by
  cross-referencing `app/output/data.json`'s per-item unit
  (sourced from the real MSS print). First run: 472/1587 items
  got a real on-hand quantity, 91 units corrected.
- **Bug fix**: `components/theme-provider.tsx`'s `d`-key dark
  mode hotkey threw `Cannot read properties of undefined
  (reading 'toLowerCase')` because `event.key` can be
  `undefined` for some key events. Changed to
  `event.key?.toLowerCase()`.
- **Fix: track log "Out" didn't match WIP stock** (2026-09-28).
  The 302 production-demand rows (MSS `QTREQ`) lived in
  `app/output/data.json`, so the track log rendered them as
  undated "Out" withdrawals (e.g. 100131: "Out 294.633 LM") even
  though they were never deducted from stock (WIP correctly
  showed 1,117.257 = 417.173 + 700.084 from `OH-LLOCN.xlsb`).
  Resolved the Output dual-meaning open question by splitting:
  demand moved to `app/output/demand.json` (`build:output` now
  writes there; `readDemand()` in `lib/warehouse.ts`; shown in a
  separate "Production demand" section on `/output` via the
  previously unused `OutputTable`). `app/output/data.json` is now
  a pure withdrawal log (reset to `[]` — it held no real
  withdrawals). `sync:onhand` reads units from `demand.json` and
  re-applies app transactions dated after the snapshot file's
  mtime instead of overwriting them. Stock/transaction
  quantities are rounded to 3 decimals to stop float drift.
  `readTrackLog()` sorts by parsed timestamp.
- **Withdrawals count down production demand** (2026-09-28).
  `withdrawFromWarehouse` now also decrements the matching item's
  `quantity` in `app/output/demand.json` by the withdrawn amount
  (floored at 0, via new `reduceDemand()` in `lib/warehouse.ts`).
  "Production demand" on `/output` reads as remaining requirement
  rather than a fixed figure. One-way link only: demand never
  affects stock, and `npm run build:output` still fully
  overwrites `demand.json` from the latest MSS print (resetting
  the countdown) — receiving stock doesn't add demand back.

- **Output replaced with a request/pickup workflow** (2026-09-29).
  Modeled on `ref/ONLINE PHỤ LIỆU 1 NEW.xlsx` (a Microsoft Forms
  log the plant used for the same purpose: line, item, quantity,
  name of the person receiving). The instant "Get from warehouse"
  withdraw card is gone from `/output`; production now submits a
  request (item, quantity, line, requester name) via
  `components/request-form-card.tsx` → `createRequestAction` →
  `createRequest()` in `lib/warehouse.ts`, stored in the new
  `app/output/requests.json` (`WarehouseRequest[]`, status
  `pending`/`ready`/`picked_up`). Warehouse staff (the receiver)
  see it in `components/requests-table.tsx`, enter their name to
  mark it `ready` (`markRequestReadyAction` /
  `markRequestReady()`) — this is the "notify the requester to
  come pick up" moment, surfaced as a "Ready for pickup" badge
  plus a pending-count banner at the top of `/output` (no
  push/SMS notification exists in this no-auth internal tool).
  Stock is only deducted when a ready request is confirmed
  picked up (`confirmPickupAction` / `confirmRequestPickup()`),
  which internally calls the existing `withdrawFromWarehouse()`
  so the track log and production-demand countdown behave exactly
  as before. `readOutputRecords()`/`app/output/data.json` (the
  withdrawal log) and demand logic are unchanged.

- **Multi-user login + role-based access** (2026-09-29). Added
  `app/login/` (shadcn `login-01` block, wired to
  `loginAction`/`logoutAction` in `app/login/actions.ts`),
  `lib/auth.ts` (12 accounts in `lib/users.json` — `admin`,
  `warehouse`, `line1`…`line10` — scrypt-hashed passwords,
  default password = username), and `lib/session.ts` (JWT
  session cookie via `jose`, no expiry until logout). `proxy.ts`
  (Next 16 renamed `middleware.ts` to this) gates every route:
  no session → `/login`; wrong role for the path → redirected to
  that role's home (`/dashboard` for admin/warehouse, `/request`
  for line). Every mutating Server Action in
  `app/warehouse/actions.ts` re-checks the role too, since a
  Server Function rides along with whatever proxy coverage its
  page route has, not a separate check.
  Split the old combined Output page: production's request form
  moved to the new **Request page** (`/request`, new
  `app/request/page.tsx`) — a line account sees only its own
  line's requests (line is fixed from the session, not
  free-text) and can't fulfill them; `/output` (admin/warehouse
  only) kept the fulfill workflow (`RequestsTable` mark-ready/
  confirm-pickup), track log, and production demand, with
  `RequestFormCard` removed from it.
  `components/requests-table.tsx`'s `markReadyAction`/
  `confirmPickupAction` props are now optional — omitting both
  renders the table read-only (no Action column), used on
  `/request`. `components/app-sidebar.tsx` takes `username`/
  `role` props (passed down from each page's
  `requireSession()`) and filters `NavMain` items by role;
  the shadcn dashboard-demo placeholder nav groups
  (Lifecycle/Analytics/Projects/Team/documents/secondary) only
  render for admin/warehouse, not line accounts. `NavUser` gained
  a working "Log out" item (`logoutAction`).
  Verified via `tsc --noEmit` and curl'ing `/dev` with
  hand-signed session cookies (matching `lib/session.ts`'s
  scheme) for each role — see Session Notes for why curl can't
  drive the actual login form's Server Action POST.

- **Stock-availability indicator on the Request form** (2026-09-29).
  `components/item-number-field.tsx`'s `ItemOption` gained
  optional `quantity`/`unit` (already present on the `StockItem`
  values every caller passes in) and the field is now controllable
  (`value`/`onValueChange`) instead of fully uncontrolled, so
  `RequestFormCard` can read back which item is selected; the
  autocomplete dropdown also shows each item's on-hand qty/unit.
  `components/request-form-card.tsx` tracks the typed item number
  and quantity, and — once both are entered — shows a
  green/amber/red line under the Quantity field: red if the
  requested quantity exceeds on-hand stock, amber if it would
  leave less than 20% of the requested amount as leftover margin,
  green otherwise. Lets a line requester see upfront whether the
  warehouse can actually fulfill the request. The old static
  "Submit a request..." `CardDescription` was dropped from the
  card.

- **Warehouse Plant page** (`/plant`, new, 2026-09-29). A stateless,
  in-memory-only tool for warehouse staff to drag-and-drop a
  periodic `MSS-*.xlsb`/`.xlsx` production print and instantly get
  the per-component-category plan-sheet breakdown that's otherwise
  maintained by hand across 5 separate Excel workbooks in `ref/`
  (`2.KH QP...`, `4.KH DÂY LUỒN...`, `5. KẾ HOẠCH DÂY KÉO...`,
  `8.KH CHỈ.xlsx`, `9.KH CHỈ BREP...`). Fully separate from
  `lib/warehouse.ts`/`app/output/demand.json` — nothing here
  touches stock or is persisted; every request parses the upload,
  classifies rows, and generates downloadable `.xlsx` buffers
  fresh, in memory, via `lib/plant.ts` (no React/Next imports,
  same convention as `lib/warehouse.ts`) and the Server Action in
  `app/plant/actions.ts`.
  - Classification is a first-match-wins keyword regex on `CDESC`
    into 4 categories (Chỉ/thread, Dây kéo/zipper, Dây
    luồn/drawstring, QP-Foam-Nhãn) plus "Unclassified" for
    everything else (shown, not dropped).
  - Each category replicates its reference workbook's B2
    (Farbic) / B3 (Leather) split by the row's own Leather/Farbic
    flag (zero overlap verified), plus Chỉ/Dây luồn's percentage
    splits (10/85/5 for item 100730/100730I, 17/68/7/8 for other
    Chỉ items, 20/80 CM/PREP for drawstring) taken directly from
    the reference files' cell formulas.
  - **Real-data surprise, verified firsthand**: the documented
    "Mã" flag column (MOBOM index 18) is blank in the actual test
    file (`ref/1.MSS1004.xlsx`) — the Leather/Farbic/Gối values
    are one column over, under "Note" (index 19). `lib/plant.ts`'s
    `detectFlagColumn` handles this by scanning candidate columns
    (and, failing that, every column) for actual Leather/Farbic
    values instead of trusting the header name, and surfaces which
    column it used as an on-page warning.
  - The `ref/4...` "Luồn đen" (black drawstring) open question is
    resolved: its item (`WNK102125`) uses the same 20%/80%
    CM/PREP split as white drawstring (`101465`), confirmed by
    reading both sheets' cell formulas directly.
  - `ref/9.KH CHỈ BREP...`'s Ticking/Decking/PrepB2/PrepB3
    breakdown is implemented as a best-effort tab per the
    documented rule (FITEM contains TICKING/DECKING; remainder
    split by the Leather/Farbic flag) but is explicitly marked
    **unverified** in the UI on every one of its sheets — sampling
    during this session also hit a row that didn't match the
    expected sheet-name↔flag mapping, so this needs a known-good
    MSS run to validate before anyone relies on it.
  - New `components/plant-uploader.tsx` (dropzone — native HTML5
    drag events + hidden `<input type="file">`, synced via
    `DataTransfer` and `form.requestSubmit()` so the real Server
    Action form submission handles it, no hand-rolled fetch),
    `components/plant-category-card.tsx` (per-category Tabs of
    buckets), `components/plant-preview-table.tsx` (plain dynamic-
    column shadcn `Table`, capped at 50 preview rows — columns
    differ too much between categories to reuse
    `items-table.tsx`'s fixed shape), `components/plant-download-
    button.tsx` (base64 → Blob → client-side download, one per
    sheet and one per category for "download all sheets").
  - Added to nav (`components/app-sidebar.tsx`, `FactoryIcon`,
    admin/warehouse only) and `lib/auth.ts`'s `canAccessPath` for
    the `warehouse` role.
  - **Two `next.config.ts` settings were required, not one** —
    found by actually driving a real multipart upload against the
    running dev server, not just reading the Server Actions doc:
    `experimental.serverActions.bodySizeLimit` (documented, raised
    to `30mb` from the 1MB default) *and* the easy-to-miss
    `experimental.proxyClientMaxBodySize` (also raised to `30mb`,
    default 10MB) — because this app's `proxy.ts` runs on every route,
    Next buffers the whole request body in memory for it, capped
    separately from `bodySizeLimit`. Without the second setting,
    any upload over ~10MB silently truncated mid-multipart-body and
    broke with a generic "Failed to parse body as FormData" /
    "Unexpected end of form" error — reproduced with both `curl`
    and Node's native `fetch`, confirmed fixed by raising
    `proxyClientMaxBodySize`, and re-confirmed against the real
    ~24MB `ref/1.MSS1004.xlsx` end to end.

- **Warehouse Plant: real-browser verification + a fixed
  disclosure gap** (2026-09-29). Drove the actual dev server with
  a real (not headless-shell) Chrome via `playwright-core`
  (`channel: "chrome"`, see updated Session Notes below) — logged
  in with a hand-signed session cookie, dragged the real
  `ref/1.MSS1004.xlsx` in, and clicked through every category's
  tabs and both download paths. No console errors; every
  category's Combined/B2/B3/Other row counts sum exactly to its
  matched-row total (and the Chỉ Brep breakdown's 5 buckets sum
  exactly to the Chỉ total); percentage-split math checked by hand
  against the raw `QTREQ` values; downloaded `.xlsx` files open
  with the same sheets/values shown on screen.
  Found one real gap: `buildDrawstringCategory` in `lib/plant.ts`
  applied the CM 20% / PREP 80% split (formula-verified only for
  items `101465`/`WNK102125`) to every other drawstring item too
  (e.g. "DÂY LUỒN 4.0", "DÂY LUỒN NHỰA to" — 3,671 rows in the real
  file) with no disclosure, unlike the Chỉ Brep breakdown which is
  clearly marked unverified. Fixed by giving `buildFlagSplitGroup`
  an optional `note` param and adding the same amber
  unverified-note treatment (`DRAWSTRING_OTHER_NOTE`) to the "Other
  drawstring items" group's sheets — re-verified the note renders
  in the real browser after the fix.
  Also noted, not fixed (matches the source MOBOM data itself, not
  a bug in this app): pillow-suffixed (`FITEM` ending `PLW`/`PLIH`)
  rows carry a formatted date string (e.g. "2026-09-28") in the
  `UNMSR`/unit column instead of a real unit — the plant's own
  MOBOM export has this quirk for pillow rows (confirmed the
  original `ref/5...` "BOM gối" sheet shows the same thing), so
  `/plant` just passes it through faithfully rather than inventing
  a unit that isn't there.

- **Warehouse Plant renamed to Warehouse Plan; upload now
  regenerates Production demand** (2026-09-29). Renamed the page
  label everywhere (nav, page title, EN/VI dictionaries;
  `/plant` route and internal file/type names unchanged) —
  the old "Plant" name was a mistranslation of "KH" (Kế Hoạch /
  Plan) in the reference workbook names it replicates. Also wired
  a successful upload to regenerate `app/output/demand.json`
  directly: `buildDemandFromMobomRows()` (new, `lib/plant.ts`)
  reuses the same MOBOM-row-to-item-master aggregation as
  `scripts/build-output.mjs`, and `replaceDemand()` (new,
  `lib/warehouse.ts`) writes it wholesale, same as the script does.
  `npm run build:output` is unchanged and still works as a
  standalone batch alternative against `ref/*.xlsb` — the two now
  share the same aggregation *approach* but not the same code (the
  script keeps its own hardcoded-column-index copy; unifying them
  wasn't attempted this session, noted as a possible follow-up).
  The Plant page's on-page category breakdown itself is still
  fully in-memory/not persisted — only demand.json is now written.

## In Progress

- None yet.

## Next Up

- Re-run `npm run build:output` whenever a new
  `MSS-xxxx-xxxx-xxxx ... Print.xlsb` file is dropped into
  `ref/`, and `npm run sync:onhand` whenever a new
  `OH-LLOCN.xlsb` snapshot lands. Both scripts always pick the
  right file dynamically, so no code changes should be needed —
  just re-run and commit the regenerated JSON.
- ~~Consider automating regeneration~~ — done: dropping a file on
  `/plant` (Warehouse Plan) now regenerates `demand.json` directly;
  `npm run build:output` remains as a manual/batch alternative.

- Set a real `AUTH_SECRET` env var before running this anywhere
  shared — `lib/session.ts` falls back to a hardcoded dev secret
  if it's unset, which would let anyone forge a session cookie.
- All 12 accounts still have their default password (same as the
  username, e.g. `line3`/`line3`) — worth changing before this is
  used outside this session, by editing `lib/users.json`'s
  `passwordHash` (see `hashPassword()` in `lib/auth.ts`).

## Open Questions

- `/plant`'s response payload is large for the real ~24MB MSS file
  (measured ~241MB for one full upload+process round trip) because
  every category's combined workbook *and* every individual
  sub-sheet each carry their own base64-encoded `.xlsx` buffer in
  the same Server Action response (chosen to keep the whole feature
  a single stateless round trip per the "process fully in-memory
  per request" requirement, rather than caching parsed rows
  server-side across requests). It completed in ~22s against the
  real file in this session, but a slower network than localhost,
  or a bigger MSS print, could make this feel sluggish — worth
  revisiting (e.g. only building a sub-sheet's buffer when its
  download button is actually clicked) if that becomes a real
  complaint.
- `ref/9.KH CHỈ BREP B2, B3, Dec, Tic.xlsx`'s Ticking/Decking/
  PrepB2/PrepB3 breakdown on `/plant` is explicitly marked
  unverified in the UI — the FITEM-contains-TICKING/DECKING plus
  remainder-by-flag rule is a best guess, not confirmed against a
  known-good historical MSS run. Needs a human check before anyone
  relies on those 4 sheets' numbers.
- The 296 historical rows in `ref/ONLINE PHỤ LIỆU 1 NEW.xlsx`
  were not migrated into `app/output/requests.json` — item/qty
  values there are messy free text (e.g. "5 trắng", "6 bó",
  multiple items per row) that predates the item-master
  autocomplete this app enforces. Treated as reference for the
  field design only, not a data source. Flag if a real import is
  wanted.
- No real push/SMS notification exists for "receiver notifies
  requester" — it's currently just a visible status badge and
  pending-count banner on `/output`, seen only if someone has the
  page open. Worth a human decision if a stronger notification
  channel (e.g. a chat webhook) is needed.

- `sync:onhand` treats `OH-LLOCN.xlsb`'s file mtime as the
  snapshot time when deciding which app transactions to
  re-apply. If the export is copied in a way that resets mtime,
  post-snapshot transactions could be missed or double-counted —
  worth confirming how the file is delivered.
- `app/input/data.json` still holds the two test receipts
  (900613 ×50, 106652 ×20) from earlier sessions, reflected in
  their WIP stock (neither is in `OH-LLOCN.xlsb`). Clear both if
  they weren't real.
- Should Output's production-demand aggregation be scoped/grouped
  by MO (`ORDNO`)/job instead of a single total across the whole
  file? Current implementation sums `QTREQ` across all rows per
  item number.
- Encoding: some `material` values from `item_nhập_kho.md` are
  mojibake (e.g. "N?t Nh?a") — source data issue, not fixed here.
- `npm run sync:onhand` only updates items it finds in
  `OH-LLOCN.xlsb`'s `Data1` sheet (472/1587 on first run) — the
  remaining ~1100 items still show `quantity: 0`. Unclear if
  that's correct (genuinely no stock) or those items just aren't
  tracked by location in that export. Needs a human check.

## Architecture Decisions

- No database — data is pre-baked into static JSON files
  under each route's folder (`app/items/data.json`,
  `app/output/data.json`) at build/script time, then imported
  directly by the page. Matches the pattern already used by
  the shadcn dashboard demo (`app/dashboard/data.json`).
- `.xlsb` parsing uses the `xlsx` (SheetJS) package, added as
  a dependency, driven by `scripts/build-output.mjs`. Not run
  automatically as part of `next build`/`next dev` — run
  manually via `npm run build:output` after updating `ref/`.
- Output join key is the item number (`CITEM` in MOBOM ==
  `itemNumber` in items data), not description — MOBOM
  descriptions can differ slightly in formatting.
- No database still. `app/items/data.json`, `app/output/data.json`,
  `app/input/data.json` are now also *written to* at runtime
  (not just read) by the warehouse Server Actions, using plain
  `node:fs` reads/writes — no queue, no locking. Fine for a
  single local user; would race under concurrent writers.
- Warehouse mutation logic lives in `lib/warehouse.ts` (pure
  read/validate/write functions), called from `'use server'`
  actions in `app/warehouse/actions.ts`. Keeps the actions file
  thin and the file I/O testable/reusable outside a request.
- Item-number entry uses `@base-ui/react`'s `Autocomplete`
  (already a transitive convention here — `Select` in
  `components/ui/select.tsx` is also base-ui) rather than a
  native `<datalist>`, so suggestions can show item number +
  description together and filter on both.
- `readTrackLog()` (`lib/warehouse.ts`) merges input + output
  records in memory at read time rather than writing to a
  combined file — keeps input/output as the two real stores and
  the log as a derived view, consistent with the "no database,
  read fresh at request time" pattern.
- `ItemsTable` (`components/items-table.tsx`) is shared between
  `/items` and `/wip` via a `showStock` boolean prop instead of
  forking a second component, since every other column is
  identical.
- On-hand truth now comes from `ref/OH-LLOCN.xlsb` (via
  `scripts/sync-onhand.mjs`), not from manually seeded/zeroed
  values in `app/items/data.json` — that file was found to be
  almost entirely placeholder data (see Completed).
- `app/output/requests.json` is a new, separate store from
  `app/output/data.json` — requests are a pending/ready/picked-up
  workflow (mutated at every stage), while `data.json` stays the
  append-only log of confirmed withdrawals only, written once per
  request at `confirmRequestPickup` time. Kept separate rather
  than adding a status field to `data.json` so the track log
  never has to filter out not-yet-fulfilled rows.
- `confirmRequestPickup` calls the existing `withdrawFromWarehouse`
  rather than duplicating the stock-decrement/track-log/demand
  logic, so a picked-up request is indistinguishable from a
  direct withdrawal everywhere except `requests.json` itself.
- Row-level actions on `/output`'s requests table (`Mark ready`,
  `Confirm pickup`) are small per-row client components each
  with their own `useActionState`, rather than one page-level
  form — needed because each row's action targets a different
  `requestId` and can be pending/erroring independently of every
  other row.

- Auth uses `proxy.ts`, not `middleware.ts` — Next.js 16 renamed
  the file convention (function export renamed `middleware` →
  `proxy` too); `middleware.ts` would simply not run. Checked
  `node_modules/next/dist/docs/01-app/03-api-reference/
  03-file-conventions/proxy.md` before writing it, per
  `AGENTS.md`'s instruction to read the version-specific docs
  before touching framework APIs.
- Session is a self-signed JWT (via `jose`, already a transitive
  dep through `shadcn`) rather than an in-memory/file session
  store, so it needs no server-side session storage and works
  the same in `proxy.ts` (edge-capable) and Server Actions (Node)
  — consistent with the "no database" rule, and simpler than
  wiring up `iron-session` or similar for a 12-account internal
  tool.
- Passwords are scrypt-hashed (Node's built-in `node:crypto`),
  not bcrypt — avoids adding a native-binding dependency on a
  Windows dev machine that already has Turbopack native-binding
  issues (see Session Notes).

## Session Notes

- `ref/` files (`item_nhập_kho.md`, `MSS-*.xlsb`) are the
  source of truth and are expected to be replaced/added to
  over time; regeneration scripts should always resolve them
  dynamically (glob/latest-mtime) rather than hardcoding a
  filename.
- Turbopack native bindings aren't available on this Windows
  dev machine; use `next build --webpack` if `next build`
  fails with a Turbopack platform error. `next dev` (webpack,
  non-turbo) works fine.
- `npm run lint` is currently broken on this machine
  independent of any app code (`eslint-plugin-react`'s
  `react/display-name` rule throws
  `contextOrFilename.getFilename is not a function`, reproduces
  on untouched files like `app/dashboard/page.tsx`) — not
  something to chase inside a feature change.
- **Update (2026-09-29): headless browser testing does work now**
  — the earlier block was specifically Group Policy blocking
  Playwright's own downloaded `chrome-headless-shell.exe`, not
  headless Chrome in general. Workaround: install `playwright-core`
  only (not the full `playwright` package, which tries to download
  its own browser binaries) somewhere outside the repo — e.g. this
  session used a scratch dir — and launch with
  `chromium.launch({ channel: "chrome", headless: true })`, which
  drives the machine's real installed
  `C:\Program Files\Google\Chrome\Application\chrome.exe` instead
  of downloading/launching the blocked shell binary. To get a
  logged-in session without touching `lib/users.json`'s real
  password hashes, hand-sign a JWT with `jose`'s `SignJWT` using
  the same payload shape/secret fallback as `lib/session.ts`, and
  set it as the `session` cookie via
  `context.addCookies([...])` before navigating — no need to drive
  the actual login form. Used successfully to verify `/plant`
  end to end (see the Completed entry above). Don't add
  `playwright-core` to this repo's own `package.json` for this —
  it's a throwaway test-driver dependency, not app code.
- Prior note (superseded by the above, kept for context): earlier
  sessions saw Group Policy block `chrome-headless-shell.exe`
  ("This program is blocked by group policy") and fell back to
  `tsc --noEmit`, curl'd SSR HTML, and exercising `lib/warehouse.ts`
  directly with `node --experimental-strip-types` instead of a real
  browser.
