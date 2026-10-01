# Accessory Warehouse

## Overview

An internal Next.js app for tracking the accessory warehouse
at an Ashley Furniture sewing/upholstery plant (sup-team:
Nguyen, Thi Dung). It replaces manually cross-checking Excel
exports (item master list, production print, on-hand-by-location)
by giving warehouse staff one place to see current stock (WIP),
receive stock in, withdraw stock out, and see a combined
in/out track log — while the authoritative numbers still come
from periodic Excel/xlsb exports dropped into `ref/`.

## Goals

1. Let staff withdraw ("Output") and receive ("Input") stock
   by item number + quantity, with the change reflected
   immediately in current stock.
2. Give a single, always-current view of on-hand quantity per
   item (WIP), sourced from the plant's real on-hand-by-location
   export rather than guesswork.
3. Keep a readable daily track log of stock movements, separate
   from the item master list.

## Core User Flow

1. Staff opens **WIP** to check current stock of an item before
   pulling or adding to it.
2. Staff opens **Input** to receive stock: pick an item number
   (autocomplete), enter quantity, submit — item's on-hand
   quantity increases and a dated record is logged.
3. Staff on the production line open **Output** to request an
   item (item number, quantity, line, requester name). Warehouse
   staff see the request, enter their name to mark it ready —
   this is the cue for the requester to come pick it up — and
   confirm the pickup once handed over, which is the point stock
   actually decreases (blocked if insufficient). The same page
   shows the resulting track log and production demand
   underneath.
4. Periodically, whoever maintains the Excel exports drops a new
   `OH-LLOCN.xlsb` (on-hand by location) file into `ref/` and
   re-runs `npm run sync:onhand` to refresh on-hand numbers, or
   uses `npm run build:output` as a manual alternative to #5
   below for refreshing production demand from a new
   `MSS-*.xlsb` without going through the UI.
5. Whoever plans component supply drags a new `MSS-*.xlsb`
   production print into **Warehouse Plan** (`/plant`) to get the
   per-component-category breakdown (thread, zipper, drawstring,
   QP/foam/label) that's otherwise built by hand across 5 Excel
   workbooks — this is also now the normal way `app/output/
   demand.json` gets refreshed, since the same upload regenerates
   it automatically.

## Features

### Item master

- **Item list** (`/items`): searchable/filterable reference of
  every known item (item number, description, material,
  sup-team) — no stock quantity shown here on purpose.

### Stock tracking

- **WIP** (`/wip`): current on-hand quantity + unit per item,
  same table as Item list plus Stock/Unit columns.
- **Input** (`/input`): transaction form (autocomplete item
  number + quantity) that mutates stock on-hand and appends to a
  log file.
- **Request** (`/request`): production submits a request
  (item/quantity/requester; line is fixed to the logged-in
  line account) and sees a track log of its own line's requests.
- **Output** (`/output`): warehouse staff see every pending
  request, mark it ready (notifying the requester) and confirm
  pickup, which is what mutates stock on-hand and appends to the
  log file.
- **Track log** (on `/output`): combined, sortable/filterable
  history of every "in" and "out" transaction with date.

### Production demand

- **Output requirement data**: `app/output/demand.json` holds
  the aggregated production requirement (`QTREQ`) per item from
  the latest MSS production print, fully overwritten each time a
  new print is processed — either by dropping it on **Warehouse
  Plan** (`/plant`, the normal path) or by running
  `npm run build:output` by hand against `ref/*.xlsb`. Shown in a
  separate "Production demand" section on `/output` as a
  *remaining* requirement: every withdrawal counts its quantity
  down against the matching item's demand (floored at 0), so it
  drops toward zero as stock goes out to fulfill it. Not part of
  the track log or stock itself — only linked one-way
  (withdrawals reduce demand; demand never affects stock).

### Warehouse Plan

- **Warehouse Plan** (`/plant`): drag-and-drop an `MSS-*.xlsb`/
  `.xlsx` production print and get it converted, in memory, into
  the per-component-category plan sheets that whoever plans
  component supply currently builds by hand across 5 separate
  Excel workbooks (`ref/2.KH QP...`, `ref/4.KH DÂY LUỒN...`,
  `ref/5. KẾ HOẠCH DÂY KÉO...`, `ref/8.KH CHỈ.xlsx`, `ref/9.KH
  CHỈ BREP...`) — item numbers resolved to their Vietnamese
  component description, classified into Chỉ (thread)/Dây kéo
  (zipper)/Dây luồn (drawstring)/QP-Foam-Nhãn, split
  B2 (Farbic)/B3 (Leather) by the row's fabric-type flag, and
  (for Chỉ/Dây luồn) split by the fixed department percentages
  those workbooks use. Downloadable as `.xlsx` per category/sheet.
  Nothing here is saved to `ref/` — the one exception is
  `app/output/demand.json`, which a successful upload regenerates
  wholesale (see "Output requirement data" above).
  One sub-breakdown (Ticking/Decking/PrepB2/PrepB3, from
  `ref/9...`) is shown but explicitly marked unverified — see
  `progress-tracker.md`'s Open Questions.

## Scope

### In Scope

- Single-plant, single-warehouse, single default sup-team
  (no multi-tenant/user accounts).
- File-based data (JSON + xlsx/xlsb exports), no database.
- Manual, human-triggered re-sync from Excel exports.

### Out of Scope

- Real-time multi-user concurrency guarantees (single local
  user at a time assumed).
- Automatic ingestion of new Excel exports (always a manual
  `npm run ...` script run or a manual upload on Warehouse Plan
  today — no watcher/cron pulls files on its own).

## Success Criteria

1. A staff member can withdraw/receive stock for a real item
   number and immediately see the updated on-hand quantity on
   WIP.
2. WIP on-hand quantities match the plant's `OH-LLOCN.xlsb`
   export after running `npm run sync:onhand`.
3. The Output track log shows a clear, dated history of who/what
   moved in and out, distinct from the item master list.
