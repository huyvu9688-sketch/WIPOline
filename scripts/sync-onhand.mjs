// Syncs on-hand quantities in app/items/data.json from the warehouse's
// authoritative on-hand-by-location export (ref/OH-LLOCN.xlsb, "Data1" sheet).
// Also fixes unit-of-measure using app/output/demand.json (built from the MSS
// production print, which carries the correct UOM per item) where available.
// Re-run this whenever a new OH-LLOCN.xlsb snapshot lands in ref/.
//
// The snapshot is taken as of the file's modified time. Input/Output
// transactions logged in the app *after* that time aren't in the snapshot yet,
// so they're re-applied on top instead of being silently overwritten.
import { existsSync, readFileSync, statSync, writeFileSync } from "fs"
import path from "path"
import XLSX from "xlsx"

const root = path.resolve(import.meta.dirname, "..")
const onHandFile = path.join(root, "ref/OH-LLOCN.xlsb")

const readJson = (rel) =>
  JSON.parse(readFileSync(path.join(root, rel), "utf-8"))
const round3 = (n) => Math.round(n * 1000) / 1000

const wb = XLSX.readFile(onHandFile)
const sheet = wb.Sheets["Data1"]
if (!sheet) {
  console.error(`No "Data1" sheet found. Sheets: ${wb.SheetNames.join(", ")}`)
  process.exit(1)
}

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 1, defval: "" })

const ITNBR = 1
const LQNTY = 4

const onHand = new Map()
for (const row of rows) {
  const code = String(row[ITNBR]).trim()
  if (!code) continue
  const qty = Number(row[LQNTY]) || 0
  onHand.set(code, (onHand.get(code) ?? 0) + qty)
}

const snapshotTime = statSync(onHandFile).mtimeMs
const netSinceSnapshot = new Map()
for (const record of [
  ...readJson("app/input/data.json"),
  ...readJson("app/output/data.json"),
]) {
  if (!(Date.parse(record.date) > snapshotTime)) continue
  const sign = record.type === "in" ? 1 : -1
  netSinceSnapshot.set(
    record.itemNumber,
    (netSinceSnapshot.get(record.itemNumber) ?? 0) + sign * record.quantity
  )
}

const demandRecords = existsSync(path.join(root, "app/output/demand.json"))
  ? readJson("app/output/demand.json")
  : []
const unitByItem = new Map(demandRecords.map((r) => [r.itemNumber, r.unit]))

const items = readJson("app/items/data.json")

let updated = 0
let replayed = 0
let unitFixed = 0
for (const item of items) {
  if (onHand.has(item.itemNumber)) {
    const net = netSinceSnapshot.get(item.itemNumber) ?? 0
    if (net !== 0) replayed++
    item.quantity = round3(onHand.get(item.itemNumber) + net)
    updated++
  }
  const unit = unitByItem.get(item.itemNumber)
  if (unit && unit !== item.unit) {
    item.unit = unit
    unitFixed++
  }
}

writeFileSync(
  path.join(root, "app/items/data.json"),
  JSON.stringify(items, null, 2) + "\n",
  "utf-8"
)

console.log(`Synced on-hand quantity for ${updated}/${items.length} items.`)
console.log(`Re-applied post-snapshot transactions for ${replayed} items.`)
console.log(`Fixed unit-of-measure for ${unitFixed} items.`)
