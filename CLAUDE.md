# Accessory Warehouse

An internal Next.js tool for the accessory warehouse at an
Ashley Furniture sewing/upholstery plant. It replaces manually
cross-checking Excel exports by giving warehouse staff one
place to check current stock, log stock in/out, and see a
daily track log — while the numbers themselves still come from
the plant's own periodic Excel/xlsb exports.

## Read this first

Full project context lives in [`context/`](context/) — read
[`context/project-overview.md`](context/project-overview.md)
and [`context/progress-tracker.md`](context/progress-tracker.md)
before making non-trivial changes; also see
[`context/architecture.md`](context/architecture.md),
[`context/code-standards.md`](context/code-standards.md),
[`context/ui-context.md`](context/ui-context.md), and
[`context/ai-workflow-rules.md`](context/ai-workflow-rules.md).
This project also has an `AGENTS.md` describing Next.js-version
specific conventions — read it before touching framework APIs.

## Pages

- `/items` — item master list (item number, description,
  material, sup-team). No stock shown here.
- `/wip` — current on-hand quantity + unit per item (same table
  as `/items`, plus Stock/Unit columns).
- `/input` — receive stock into the warehouse (item number +
  quantity form, autocomplete).
- `/output` — withdraw stock from the warehouse, plus the
  combined in/out daily track log below it.
- `/dashboard` — shadcn dashboard demo scaffold.

## No database

Everything is flat JSON under `app/<route>/data.json`, read
fresh at request time (never a static import) via
`lib/warehouse.ts`, and mutated only through the Server Actions
in `app/warehouse/actions.ts`. Authoritative source data (item
master, production print, on-hand-by-location) are Excel/`.xlsb`
exports in `ref/`; `scripts/*.mjs` regenerate the JSON from them
— run manually (`npm run build:output`, `npm run sync:onhand`),
never as part of `next build`/`next dev`.

## Output data (read before touching Output)

`app/output/data.json` is the append-only withdrawal log only.
Production demand from the MSS print lives separately in
`app/output/demand.json` and must never be mixed into the log —
mixing them previously made the track log show demand as fake
"Out" rows that didn't match WIP stock. Demand is still linked
one-way to stock, on purpose: `withdrawFromWarehouse` counts
each withdrawal down against the matching item's demand quantity
(floored at 0), so the "Production demand" section on `/output`
reads as remaining requirement, not a fixed figure. It never
runs the other way — demand never touches stock.

`app/output/demand.json` is overwritten wholesale (never merged)
by whichever MSS print was processed most recently, via either
path below:

- Dropping an MSS-\*.xlsb/.xlsx file on `/plant` (Warehouse
  Plan) — the normal path; `app/plant/actions.ts` calls
  `buildDemandFromMobomRows()` in `lib/plant.ts` and
  `replaceDemand()` in `lib/warehouse.ts` right after building
  the on-page category preview.
- `npm run build:output`, run manually against whatever
  `ref/MSS-*.xlsb` is newest — a standalone batch alternative
  with its own copy of the same aggregation logic (plain Node,
  no web upload needed).

## Commands

- `npm run dev` — dev server (webpack; Turbopack isn't
  available on this Windows machine).
- `npm run build` — `next build --webpack`, same reason.
- `npm run typecheck` — `tsc --noEmit`; the standard way to
  verify changes here (no working browser/E2E setup on this
  machine — see Session Notes in `progress-tracker.md`).
- `npm run build:output` — regenerate `app/output/demand.json`
  production-demand rows from the latest `ref/MSS-*.xlsb`.
- `npm run sync:onhand` — sync `app/items/data.json` on-hand
  quantities/units from `ref/OH-LLOCN.xlsb`, re-applying any
  app transactions logged after the snapshot file's mtime.
