// "Warehouse Plan" conversion tool: parses an uploaded MSS production print
// (MOBOM/MSS sheet) and reproduces, in memory only, the per-component-category
// plan-sheet breakdown that's currently maintained by hand in 5 separate Excel
// workbooks (see ref/2.KH QP..., ref/4.KH DÂY LUỒN..., ref/5. KẾ HOẠCH DÂY
// KÉO..., ref/8.KH CHỈ.xlsx, ref/9.KH CHỈ BREP...). The category breakdown
// itself is never persisted; the one exception is production demand, which
// app/plant/actions.ts writes to app/output/demand.json via
// buildDemandFromMobomRows() below — see app/plant/actions.ts for the Server
// Action that calls into this module per request.
//
// No React/Next imports here, same convention as lib/warehouse.ts — pure
// data logic, reusable/testable outside a request.
// Named-export import, not a default import: xlsx's ESM build (xlsx.mjs,
// resolved by webpack via package.json's "module" field) exports `read`,
// `utils`, etc. directly with no `default` — a default import type-checks
// under esModuleInterop but fails at runtime in the webpack bundle ("'xlsx'
// does not contain a default export"), confirmed via the dev server log.
// scripts/*.mjs get away with `import XLSX from "xlsx"` because plain Node
// ESM synthesizes a default export for CJS modules; webpack's bundling of
// the ESM build does not.
import * as XLSX from "xlsx"

// ---------------------------------------------------------------------------
// MOBOM row model
// ---------------------------------------------------------------------------

export type FabricFlag = "farbic" | "leather" | "other"

export type MobomRow = {
  refno: string
  ordno: string
  fitem: string
  citem: string
  cdesc: string
  qtreq: number
  unmsr: string
  line: string
  /** Raw text of whichever column was detected to hold the Leather/Farbic flag. */
  flagRaw: string
  flag: FabricFlag
}

export type CategoryId = "thread" | "zipper" | "drawstring" | "qp"

/** One downloadable sheet's worth of rows (a bucket within a category). */
export type PlantSheet = {
  id: string
  label: string
  rowCount: number
  rows: PlantOutputRow[]
  /** Set for buckets whose classification rule is explicitly unverified. */
  note?: string
}

export type PlantOutputRow = Record<string, string | number>

/** A named group of related sheets within a category (e.g. "100730 (white)"). */
export type PlantSheetGroup = {
  id: string
  label: string
  sheets: PlantSheet[]
}

export type PlantCategoryResult = {
  id: CategoryId
  label: string
  matchedRowCount: number
  groups: PlantSheetGroup[]
}

export type PlantProcessResult = {
  sheetName: string
  totalMobomRows: number
  warnings: string[]
  categories: PlantCategoryResult[]
  unclassified: { rowCount: number; sheet: PlantSheet }
}

export type PlantProcessError = { error: string }

// ---------------------------------------------------------------------------
// Sheet + column resolution (defensive: prefer header name, fall back to the
// documented 0-indexed column position from scripts/build-output.mjs)
// ---------------------------------------------------------------------------

const DOCUMENTED_INDEX = {
  REFNO: 1,
  ORDNO: 2,
  FITEM: 3,
  CITEM: 8,
  CDESC: 9,
  QTREQ: 10,
  UNMSR: 12,
  LINE: 17,
  FLAG: 18, // documented header "Mã" — verified to sometimes be blank; see detectFlagColumn
} as const

/** Finds the MOBOM sheet, also accepting the "MSS" name used by the test file. */
export function findMobomSheetName(wb: XLSX.WorkBook): string | null {
  const upper = (s: string) => s.trim().toUpperCase()
  return (
    wb.SheetNames.find((n) => upper(n) === "MOBOM") ??
    wb.SheetNames.find((n) => upper(n) === "MSS") ??
    null
  )
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function resolveColumnByName(
  headerRow: unknown[],
  name: string,
  fallbackIndex: number
): number {
  const idx = headerRow.findIndex((h) => normalizeHeader(h) === name.toLowerCase())
  return idx !== -1 ? idx : fallbackIndex
}

const FLAG_VALUES = new Set(["farbic", "leather"])
const FLAG_HEADER_CANDIDATES = ["mã", "ma", "note", "group"]

/**
 * The Leather/Farbic fabric-type flag is documented as column "Mã" (index
 * 18), and the task spec notes it's sometimes renamed "group"/"Note" per
 * file. Verified firsthand against ref/1.MSS1004.xlsx: that file's "Mã"
 * column is blank for every row, and the literal Leather/Farbic/Gối values
 * actually live one column over, under "Note" (index 19). So instead of
 * trusting the header name alone, this scans candidate columns (by likely
 * header name, then every column as a last resort) and picks whichever
 * actually contains Leather/Farbic values.
 */
function detectFlagColumn(
  headerRow: unknown[],
  dataRows: unknown[][]
): { index: number; headerName: string; detected: boolean } {
  const sampleSize = Math.min(dataRows.length, 3000)

  function score(index: number): number {
    let hits = 0
    for (let r = 0; r < sampleSize; r++) {
      if (FLAG_VALUES.has(normalizeHeader(dataRows[r]?.[index]))) hits++
    }
    return hits
  }

  const headerIndexByName = new Map<string, number>()
  headerRow.forEach((h, i) => {
    const key = normalizeHeader(h)
    if (key && !headerIndexByName.has(key)) headerIndexByName.set(key, i)
  })

  let best = { index: -1, hits: 0 }
  for (const name of FLAG_HEADER_CANDIDATES) {
    const idx = headerIndexByName.get(name)
    if (idx === undefined) continue
    const hits = score(idx)
    if (hits > best.hits) best = { index: idx, hits }
  }

  if (best.hits === 0) {
    for (let idx = 0; idx < headerRow.length; idx++) {
      const hits = score(idx)
      if (hits > best.hits) best = { index: idx, hits }
    }
  }

  if (best.index === -1) {
    return { index: DOCUMENTED_INDEX.FLAG, headerName: "Mã", detected: false }
  }
  return {
    index: best.index,
    headerName: String(headerRow[best.index] ?? "").trim() || `column ${best.index}`,
    detected: true,
  }
}

function normalizeFlag(raw: string): FabricFlag {
  const v = raw.trim().toLowerCase()
  if (v === "farbic") return "farbic"
  if (v === "leather") return "leather"
  return "other"
}

export function readMobomRows(
  wb: XLSX.WorkBook,
  sheetName: string
): { rows: MobomRow[]; warnings: string[] } {
  const ws = wb.Sheets[sheetName]
  const warnings: string[] = []
  const ref = ws["!ref"]
  if (!ref) return { rows: [], warnings: ["Sheet has no data."] }

  const range = XLSX.utils.decode_range(ref)
  const headerRow: unknown[] = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })] as
      | { v?: unknown }
      | undefined
    headerRow.push(cell?.v ?? "")
  }

  const dataRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    range: range.s.r + 1,
    defval: "",
  })

  const citemIdx = resolveColumnByName(headerRow, "CITEM", DOCUMENTED_INDEX.CITEM)
  const cdescIdx = resolveColumnByName(headerRow, "CDESC", DOCUMENTED_INDEX.CDESC)
  const qtreqIdx = resolveColumnByName(headerRow, "QTREQ", DOCUMENTED_INDEX.QTREQ)
  const unmsrIdx = resolveColumnByName(headerRow, "UNMSR", DOCUMENTED_INDEX.UNMSR)
  const fitemIdx = resolveColumnByName(headerRow, "FITEM", DOCUMENTED_INDEX.FITEM)
  const ordnoIdx = resolveColumnByName(headerRow, "ORDNO", DOCUMENTED_INDEX.ORDNO)
  const refnoIdx = resolveColumnByName(headerRow, "REFNO", DOCUMENTED_INDEX.REFNO)
  const lineIdx = resolveColumnByName(headerRow, "LINE", DOCUMENTED_INDEX.LINE)

  const flagCol = detectFlagColumn(headerRow, dataRows)
  if (!flagCol.detected) {
    warnings.push(
      `Could not confidently detect the Leather/Farbic fabric-type column — B2/B3 splits may come out empty. Falling back to the documented column ${DOCUMENTED_INDEX.FLAG} ("Mã").`
    )
  } else if (flagCol.index !== DOCUMENTED_INDEX.FLAG) {
    warnings.push(
      `Fabric-type flag (Leather/Farbic) was found under column "${flagCol.headerName}" (index ${flagCol.index}), not the documented "Mã" column (index ${DOCUMENTED_INDEX.FLAG}, blank in this file) — resolved automatically.`
    )
  }

  const rows: MobomRow[] = []
  for (const r of dataRows) {
    const citem = String(r[citemIdx] ?? "").trim()
    if (!citem) continue // guard against blank trailing rows
    const flagRaw = String(r[flagCol.index] ?? "").trim()
    rows.push({
      refno: String(r[refnoIdx] ?? "").trim(),
      ordno: String(r[ordnoIdx] ?? "").trim(),
      fitem: String(r[fitemIdx] ?? "").trim(),
      citem,
      cdesc: String(r[cdescIdx] ?? "").trim(),
      qtreq: Number(r[qtreqIdx]) || 0,
      unmsr: String(r[unmsrIdx] ?? "").trim(),
      line: String(r[lineIdx] ?? "").trim(),
      flagRaw,
      flag: normalizeFlag(flagRaw),
    })
  }

  return { rows, warnings }
}

// ---------------------------------------------------------------------------
// Classification (keyword match on CDESC, first-match-wins, per user's
// explicit choice)
// ---------------------------------------------------------------------------

export const CATEGORY_RULES: { id: CategoryId; label: string; test: RegExp }[] = [
  { id: "thread", label: "Chỉ (Thread)", test: /CHỈ/i },
  { id: "zipper", label: "Dây kéo (Zipper)", test: /DÂY KÉO|ĐẦU KÉO/i },
  { id: "drawstring", label: "Dây luồn (Drawstring)", test: /DÂY LU[ỒƠ]N/i },
  {
    id: "qp",
    label: "QP / Foam / Chống ẩm / Nhãn",
    test: /BỌC|FOAM|DESICCANT|CHỐNG ẨM|NHÃN|BĂNG KEO/i,
  },
]

function classify(cdesc: string): CategoryId | "unclassified" {
  for (const rule of CATEGORY_RULES) {
    if (rule.test.test(cdesc)) return rule.id
  }
  return "unclassified"
}

const PILLOW_FITEM = /(PLW|PLIH)$/i
function isPillowFitem(fitem: string): boolean {
  return PILLOW_FITEM.test(fitem.trim())
}

// ---------------------------------------------------------------------------
// Shared row-shaping helpers
// ---------------------------------------------------------------------------

function round(n: number, dp = 4): number {
  const f = 10 ** dp
  return Math.round((n + Number.EPSILON) * f) / f
}

function baseColumns(r: MobomRow): PlantOutputRow {
  return {
    REFNO: r.refno,
    ORDNO: r.ordno,
    FITEM: r.fitem,
    "Item Number": r.citem,
    Description: r.cdesc,
    QTREQ: round(r.qtreq),
    Unit: r.unmsr,
    Line: r.line,
    "Mã (Leather/Farbic)": r.flagRaw || "-",
  }
}

function toSheet(id: string, label: string, rows: PlantOutputRow[], note?: string): PlantSheet {
  return { id, label, rowCount: rows.length, rows, note }
}

function splitByFlag(rows: MobomRow[]) {
  const farbic: MobomRow[] = []
  const leather: MobomRow[] = []
  const other: MobomRow[] = []
  for (const r of rows) {
    if (r.flag === "farbic") farbic.push(r)
    else if (r.flag === "leather") leather.push(r)
    else other.push(r)
  }
  return { farbic, leather, other }
}

// ---------------------------------------------------------------------------
// Chỉ (Thread) — ref/8.KH CHỈ.xlsx + ref/9.KH CHỈ BREP...xlsx
// ---------------------------------------------------------------------------

const WHITE_THREAD_ITEMS = new Set(["100730", "100730I"])

function withWhiteThreadSplit(r: MobomRow): PlantOutputRow {
  return {
    ...baseColumns(r),
    "dm decking (10%)": round(r.qtreq * 0.1),
    "CHUYỀN MAY (85%)": round(r.qtreq * 0.85),
    "PREP (5%)": round(r.qtreq * 0.05),
  }
}

function withGeneralThreadSplit(r: MobomRow): PlantOutputRow {
  return {
    ...baseColumns(r),
    "dm prep (17%)": round(r.qtreq * 0.17),
    "CHUYỀN MAY (68%)": round(r.qtreq * 0.68),
    "DM DECKING (7%)": round(r.qtreq * 0.07),
    "DM NỆM (8%)": round(r.qtreq * 0.08),
  }
}

function buildFlagSplitGroup(
  id: string,
  label: string,
  rows: MobomRow[],
  mapFn: (r: MobomRow) => PlantOutputRow,
  note?: string
): PlantSheetGroup {
  const { farbic, leather, other } = splitByFlag(rows)
  const sheets: PlantSheet[] = [
    toSheet(`${id}-combined`, "Combined", rows.map(mapFn), note),
    toSheet(`${id}-b2`, "B2 (Farbic)", farbic.map(mapFn), note),
    toSheet(`${id}-b3`, "B3 (Leather)", leather.map(mapFn), note),
  ]
  if (other.length) {
    sheets.push(toSheet(`${id}-other`, "Other / unflagged", other.map(mapFn), note))
  }
  return { id, label, sheets }
}

const BREP_UNVERIFIED_NOTE =
  "Unverified — confirm against a known-good MSS run before relying on this. " +
  "Sampling suggested Ticking/Decking are matched by FITEM containing " +
  "TICKING/DECKING and the remainder splits PrepB2/PrepB3 by the Leather/" +
  "Farbic flag, but a 5-row check didn't cleanly match the sheet-name↔FITEM " +
  "mapping expected from ref/9.KH CHỈ BREP B2, B3, Dec, Tic.xlsx — no " +
  "invented percentage splits are applied here, only raw QTREQ per bucket."

function buildThreadCategory(rows: MobomRow[]): PlantCategoryResult {
  const white = rows.filter((r) => WHITE_THREAD_ITEMS.has(r.citem.toUpperCase()))
  const general = rows.filter((r) => !WHITE_THREAD_ITEMS.has(r.citem.toUpperCase()))

  const groups: PlantSheetGroup[] = [
    buildFlagSplitGroup(
      "thread-100730",
      "100730 – CHỈ MAY TRẮNG (10% / 85% / 5% split)",
      white,
      withWhiteThreadSplit
    ),
    buildFlagSplitGroup(
      "thread-general",
      "General Chỉ items (17% / 68% / 7% / 8% split)",
      general,
      withGeneralThreadSplit
    ),
  ]

  // Best-effort ref/9 breakdown — see BREP_UNVERIFIED_NOTE.
  const ticking = rows.filter((r) => /TICKING/i.test(r.fitem))
  const decking = rows.filter((r) => /DECKING/i.test(r.fitem))
  const remaining = rows.filter((r) => !/TICKING/i.test(r.fitem) && !/DECKING/i.test(r.fitem))
  const { farbic: prepB2, leather: prepB3, other: prepOther } = splitByFlag(remaining)

  const brepSheets: PlantSheet[] = [
    toSheet("thread-brep-ticking", "Ticking", ticking.map(baseColumns), BREP_UNVERIFIED_NOTE),
    toSheet("thread-brep-decking", "Decking", decking.map(baseColumns), BREP_UNVERIFIED_NOTE),
    toSheet(
      "thread-brep-prepb2",
      "PrepB2 (Farbic, remaining)",
      prepB2.map(baseColumns),
      BREP_UNVERIFIED_NOTE
    ),
    toSheet(
      "thread-brep-prepb3",
      "PrepB3 (Leather, remaining)",
      prepB3.map(baseColumns),
      BREP_UNVERIFIED_NOTE
    ),
  ]
  if (prepOther.length) {
    brepSheets.push(
      toSheet(
        "thread-brep-other",
        "Other / unflagged (remaining)",
        prepOther.map(baseColumns),
        BREP_UNVERIFIED_NOTE
      )
    )
  }
  groups.push({
    id: "thread-brep",
    label: "File 9 breakdown: Ticking / Decking / PrepB2 / PrepB3 (UNVERIFIED)",
    sheets: brepSheets,
  })

  return { id: "thread", label: "Chỉ (Thread)", matchedRowCount: rows.length, groups }
}

// ---------------------------------------------------------------------------
// Dây kéo (Zipper) — ref/5. KẾ HOẠCH DÂY KÉO B2, B3, Gối - mss 1004.xlsx
// ---------------------------------------------------------------------------

function buildZipperCategory(rows: MobomRow[]): PlantCategoryResult {
  const pillow = rows.filter((r) => isPillowFitem(r.fitem))
  const remainder = rows.filter((r) => !isPillowFitem(r.fitem))
  const { farbic, leather, other } = splitByFlag(remainder)

  const sheets: PlantSheet[] = [
    toSheet("zipper-goi", "Gối (Pillow)", pillow.map(baseColumns)),
    toSheet("zipper-b2", "B2 (Farbic)", farbic.map(baseColumns)),
    toSheet("zipper-b3", "B3 (Leather)", leather.map(baseColumns)),
  ]
  if (other.length) {
    sheets.push(toSheet("zipper-other", "Other / unflagged", other.map(baseColumns)))
  }

  return {
    id: "zipper",
    label: "Dây kéo (Zipper)",
    matchedRowCount: rows.length,
    groups: [{ id: "zipper-buckets", label: "Buckets (no % split)", sheets }],
  }
}

// ---------------------------------------------------------------------------
// Dây luồn (Drawstring) — ref/4.KH DÂY LUỒN TRẮNG +ĐEN - mss 1004.xlsx
// ---------------------------------------------------------------------------

const DRAWSTRING_WHITE_ITEM = "101465"
const DRAWSTRING_BLACK_ITEM = "WNK102125"

const DRAWSTRING_OTHER_NOTE =
  "Unverified — the 20% / 80% CM/PREP split was confirmed by reading cell " +
  `formulas for items ${DRAWSTRING_WHITE_ITEM} and ${DRAWSTRING_BLACK_ITEM} only. ` +
  "It's applied here to other drawstring items (e.g. \"DÂY LUỒN 4.0\" variants) " +
  "as a best guess, not a confirmed rule — check against a known-good MSS run " +
  "before relying on these numbers."

function withDrawstringSplit(r: MobomRow): PlantOutputRow {
  return {
    ...baseColumns(r),
    "CM (20%)": round(r.qtreq * 0.2),
    "PREP (80%)": round(r.qtreq * 0.8),
  }
}

function buildDrawstringCategory(rows: MobomRow[]): PlantCategoryResult {
  const white = rows.filter((r) => r.citem.toUpperCase() === DRAWSTRING_WHITE_ITEM)
  const black = rows.filter((r) => r.citem.toUpperCase() === DRAWSTRING_BLACK_ITEM)
  const other = rows.filter(
    (r) =>
      r.citem.toUpperCase() !== DRAWSTRING_WHITE_ITEM &&
      r.citem.toUpperCase() !== DRAWSTRING_BLACK_ITEM
  )

  const groups: PlantSheetGroup[] = [
    buildFlagSplitGroup(
      "drawstring-white",
      `Trắng (White) – item ${DRAWSTRING_WHITE_ITEM} (CM 20% / PREP 80%)`,
      white,
      withDrawstringSplit
    ),
    buildFlagSplitGroup(
      "drawstring-black",
      `Đen (Black) – item ${DRAWSTRING_BLACK_ITEM} (same 20% / 80% split, verified)`,
      black,
      withDrawstringSplit
    ),
  ]
  if (other.length) {
    groups.push(
      buildFlagSplitGroup(
        "drawstring-other",
        "Other drawstring items",
        other,
        withDrawstringSplit,
        DRAWSTRING_OTHER_NOTE
      )
    )
  }

  return { id: "drawstring", label: "Dây luồn (Drawstring)", matchedRowCount: rows.length, groups }
}

// ---------------------------------------------------------------------------
// QP / Foam / Chống ẩm / Nhãn — ref/2.KH QP (...) - mss 1004.xlsx
// ---------------------------------------------------------------------------

function buildQpCategory(rows: MobomRow[]): PlantCategoryResult {
  const { farbic, leather, other } = splitByFlag(rows)
  const sheets: PlantSheet[] = [
    toSheet("qp-combined", "Combined (BOM tổng)", rows.map(baseColumns)),
    toSheet("qp-b2", "B2 (Farbic)", farbic.map(baseColumns)),
    toSheet("qp-b3", "B3 (Leather)", leather.map(baseColumns)),
  ]
  if (other.length) {
    sheets.push(toSheet("qp-other", "Other / unflagged", other.map(baseColumns)))
  }
  return {
    id: "qp",
    label: "QP / Foam / Chống ẩm / Nhãn",
    matchedRowCount: rows.length,
    groups: [{ id: "qp-buckets", label: "Buckets (no % split)", sheets }],
  }
}

// ---------------------------------------------------------------------------
// Production demand — same aggregation as scripts/build-output.mjs (which
// reads a MOBOM sheet straight off ref/*.xlsb by hand), reused here so
// dropping a file on Warehouse Plan can regenerate app/output/demand.json
// directly instead of requiring that script to be run against ref/.
// ---------------------------------------------------------------------------

export type DemandSourceItem = {
  itemNumber: string
  description: string
  material: string | null
  supTeam: string
}

export type DemandRow = {
  itemNumber: string
  description: string
  material: string | null
  supTeam: string
  quantity: number
  unit: string
}

export function buildDemandFromMobomRows(
  rows: MobomRow[],
  items: DemandSourceItem[]
): DemandRow[] {
  const itemMap = new Map(items.map((i) => [i.itemNumber, i]))
  const byItem = new Map<string, DemandRow>()

  for (const row of rows) {
    const item = itemMap.get(row.citem)
    if (!item) continue // not an accessory-warehouse item (e.g. fabric, fiber kit)

    if (!byItem.has(row.citem)) {
      byItem.set(row.citem, {
        itemNumber: row.citem,
        description: item.description || row.cdesc,
        material: item.material,
        supTeam: item.supTeam,
        quantity: 0,
        unit: row.unmsr,
      })
    }
    byItem.get(row.citem)!.quantity += row.qtreq
  }

  return Array.from(byItem.values())
    .sort((a, b) => a.itemNumber.localeCompare(b.itemNumber))
    .map((row) => ({ ...row, quantity: Math.round(row.quantity * 1000) / 1000 }))
}

// ---------------------------------------------------------------------------
// Top-level orchestration
// ---------------------------------------------------------------------------

export function processMobomWorkbook(
  wb: XLSX.WorkBook
): PlantProcessResult | PlantProcessError {
  const sheetName = findMobomSheetName(wb)
  if (!sheetName) {
    return {
      error: `No "MOBOM" or "MSS" sheet found in this file. Sheets present: ${wb.SheetNames.join(", ")}`,
    }
  }

  const { rows, warnings } = readMobomRows(wb, sheetName)
  if (rows.length === 0) {
    return { error: `The "${sheetName}" sheet has no usable data rows.` }
  }

  const byCategory = new Map<CategoryId | "unclassified", MobomRow[]>()
  for (const row of rows) {
    const cat = classify(row.cdesc)
    const bucket = byCategory.get(cat)
    if (bucket) bucket.push(row)
    else byCategory.set(cat, [row])
  }

  const categories: PlantCategoryResult[] = [
    buildThreadCategory(byCategory.get("thread") ?? []),
    buildZipperCategory(byCategory.get("zipper") ?? []),
    buildDrawstringCategory(byCategory.get("drawstring") ?? []),
    buildQpCategory(byCategory.get("qp") ?? []),
  ]

  const unclassifiedRows = byCategory.get("unclassified") ?? []
  const unclassified = {
    rowCount: unclassifiedRows.length,
    sheet: toSheet("unclassified", "Unclassified", unclassifiedRows.map(baseColumns)),
  }

  return { sheetName, totalMobomRows: rows.length, warnings, categories, unclassified }
}

// ---------------------------------------------------------------------------
// Workbook (.xlsx) generation
// ---------------------------------------------------------------------------

function safeSheetName(name: string): string {
  const cleaned = name
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return (cleaned || "Sheet").slice(0, 31)
}

export function buildXlsxBuffer(sheets: { name: string; rows: PlantOutputRow[] }[]): Buffer {
  const wb = XLSX.utils.book_new()
  const usedNames = new Set<string>()

  for (const sheet of sheets) {
    let name = safeSheetName(sheet.name)
    let suffix = 2
    while (usedNames.has(name)) {
      name = safeSheetName(`${sheet.name} ${suffix}`)
      suffix++
    }
    usedNames.add(name)

    const ws = XLSX.utils.json_to_sheet(sheet.rows.length ? sheet.rows : [{ Note: "No rows" }])
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}
