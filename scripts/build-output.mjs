// Regenerates app/output/demand.json from the latest MSS-xxxx-xxxx-xxxx
// production print (MOBOM sheet), joined against the accessory warehouse item
// master (app/items/data.json). Re-run this whenever a new MSS file lands in
// ref/. This is production *demand* only — it never touches stock or the
// withdrawal log (app/output/data.json).
import { readdirSync, readFileSync, writeFileSync, statSync } from "fs"
import path from "path"
import XLSX from "xlsx"

const root = path.resolve(import.meta.dirname, "..")
const refDir = path.join(root, "ref")

const mssFiles = readdirSync(refDir)
  .filter((f) => /^MSS-.*\.xlsb$/i.test(f) && !f.startsWith("~$"))
  .map((f) => ({ name: f, mtime: statSync(path.join(refDir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)

if (mssFiles.length === 0) {
  console.error("No MSS-*.xlsb file found in ref/")
  process.exit(1)
}

const mssFile = mssFiles[0].name
console.log(`Using production file: ${mssFile}`)

const wb = XLSX.readFile(path.join(refDir, mssFile))
const sheetName = wb.SheetNames.find((n) => n.trim().toUpperCase() === "MOBOM")
if (!sheetName) {
  console.error(`No MOBOM sheet found. Sheets: ${wb.SheetNames.join(", ")}`)
  process.exit(1)
}

const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
  header: 1,
  range: 1,
  defval: "",
})

const CITEM = 8
const CDESC = 9
const QTREQ = 10
const UNMSR = 12

const items = JSON.parse(
  readFileSync(path.join(root, "app/items/data.json"), "utf-8")
)
const itemMap = new Map(items.map((i) => [i.itemNumber, i]))

const byItem = new Map()
for (const row of rows) {
  const code = String(row[CITEM]).trim()
  const item = itemMap.get(code)
  if (!item) continue // not an accessory-warehouse item (e.g. fabric, fiber kit)

  const qty = Number(row[QTREQ]) || 0
  const unit = String(row[UNMSR]).trim()

  if (!byItem.has(code)) {
    byItem.set(code, {
      itemNumber: code,
      description: item.description || String(row[CDESC]).trim(),
      material: item.material,
      supTeam: item.supTeam,
      quantity: 0,
      unit,
    })
  }
  byItem.get(code).quantity += qty
}

const output = Array.from(byItem.values())
  .sort((a, b) => a.itemNumber.localeCompare(b.itemNumber))
  .map((row, i) => ({
    id: i + 1,
    ...row,
    quantity: Math.round(row.quantity * 1000) / 1000,
  }))

writeFileSync(
  path.join(root, "app/output/demand.json"),
  JSON.stringify(output, null, 2) + "\n",
  "utf-8"
)

console.log(`Wrote ${output.length} items to app/output/demand.json`)
