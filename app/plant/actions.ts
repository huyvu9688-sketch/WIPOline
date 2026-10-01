"use server"

// Namespace import, not default — see the comment in lib/plant.ts for why.
import * as XLSX from "xlsx"

import { requireSession } from "@/lib/get-session"
import {
  buildDemandFromMobomRows,
  buildXlsxBuffer,
  processMobomWorkbook,
  readMobomRows,
  type PlantCategoryResult,
  type PlantSheet,
} from "@/lib/plant"
import { readItems, replaceDemand } from "@/lib/warehouse"

// Client-facing shapes. Full row data never leaves the server — only a capped
// preview (for the on-page table) and a pre-built .xlsx buffer (base64, for
// the client to turn into a Blob download) cross the Server Action boundary.
// The per-category breakdown itself is a stateless, per-request, in-memory
// conversion only (see CLAUDE.md's "no database" rules) — the one exception
// is Production demand: a successful drop here also replaces
// app/output/demand.json wholesale, same as `npm run build:output` does from
// ref/*.xlsb (see the Output-data rules in CLAUDE.md).

const PREVIEW_ROW_LIMIT = 50

export type PlantSheetView = {
  id: string
  label: string
  rowCount: number
  note?: string
  previewColumns: string[]
  previewRows: (string | number)[][]
  downloadBase64: string
  downloadFileName: string
}

export type PlantSheetGroupView = {
  id: string
  label: string
  sheets: PlantSheetView[]
}

export type PlantCategoryView = {
  id: string
  label: string
  matchedRowCount: number
  groups: PlantSheetGroupView[]
  downloadBase64: string
  downloadFileName: string
}

export type PlantActionResult = {
  fileName: string
  sheetName: string
  totalMobomRows: number
  warnings: string[]
  categories: PlantCategoryView[]
  unclassified: PlantSheetView
  demandItemCount: number
}

export type PlantActionState = {
  error?: string
  result?: PlantActionResult
}

function sheetToView(sheet: PlantSheet, fileBase: string): PlantSheetView {
  const columns = sheet.rows.length ? Object.keys(sheet.rows[0]) : []
  const previewRows = sheet.rows
    .slice(0, PREVIEW_ROW_LIMIT)
    .map((row) => columns.map((c) => row[c] ?? ""))
  const buffer = buildXlsxBuffer([{ name: sheet.label, rows: sheet.rows }])

  return {
    id: sheet.id,
    label: sheet.label,
    rowCount: sheet.rowCount,
    note: sheet.note,
    previewColumns: columns,
    previewRows,
    downloadBase64: buffer.toString("base64"),
    downloadFileName: `${fileBase}-${sheet.id}.xlsx`,
  }
}

function categoryToView(category: PlantCategoryResult, fileBase: string): PlantCategoryView {
  const groups: PlantSheetGroupView[] = category.groups.map((group) => ({
    id: group.id,
    label: group.label,
    sheets: group.sheets.map((sheet) => sheetToView(sheet, fileBase)),
  }))

  const allSheets = category.groups.flatMap((group) =>
    group.sheets.map((sheet) => ({ name: sheet.label, rows: sheet.rows }))
  )
  const buffer = buildXlsxBuffer(allSheets)

  return {
    id: category.id,
    label: category.label,
    matchedRowCount: category.matchedRowCount,
    groups,
    downloadBase64: buffer.toString("base64"),
    downloadFileName: `${fileBase}-${category.id}.xlsx`,
  }
}

export async function processPlantFileAction(
  _prevState: PlantActionState,
  formData: FormData
): Promise<PlantActionState> {
  const session = await requireSession()
  if (session.role === "line") return { error: "Not authorized." }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an MSS/MOBOM .xlsx or .xlsb file first." }
  }

  const lowerName = file.name.toLowerCase()
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xlsb")) {
    return { error: "Only .xlsx or .xlsb files are supported." }
  }

  let workbook: XLSX.WorkBook
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    workbook = XLSX.read(buffer, { type: "buffer" })
  } catch {
    return { error: "Could not read this file — is it a valid Excel/.xlsb export?" }
  }

  const processed = processMobomWorkbook(workbook)
  if ("error" in processed) {
    return { error: processed.error }
  }

  const { rows: mobomRows } = readMobomRows(workbook, processed.sheetName)
  const demand = buildDemandFromMobomRows(mobomRows, readItems())
  replaceDemand(demand)

  const fileBase = file.name.replace(/\.(xlsx|xlsb)$/i, "")

  return {
    result: {
      fileName: file.name,
      sheetName: processed.sheetName,
      totalMobomRows: processed.totalMobomRows,
      warnings: processed.warnings,
      categories: processed.categories.map((c) => categoryToView(c, fileBase)),
      unclassified: sheetToView(processed.unclassified.sheet, fileBase),
      demandItemCount: demand.length,
    },
  }
}
