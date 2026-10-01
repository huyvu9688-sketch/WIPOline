import fs from "node:fs"
import path from "node:path"

export type StockItem = {
  id: number
  itemNumber: string
  description: string
  material: string | null
  supTeam: string
  quantity: number
  unit: string
}

export type WarehouseRecord = {
  id: number
  itemNumber: string
  description: string
  material: string | null
  supTeam: string
  quantity: number
  unit: string
  date: string
  type: "in" | "out"
}

export type TrackLogRecord = WarehouseRecord

// Production requirement per item from the latest MSS print (written by
// `npm run build:output`). A planning figure only — never touches stock.
export type DemandRecord = StockItem

// Production requests an item from the warehouse; stock isn't touched until
// the request reaches "picked_up" (see confirmRequestPickup).
export type RequestStatus = "pending" | "ready" | "picked_up"

export type WarehouseRequest = {
  id: number
  itemNumber: string
  description: string
  material: string | null
  supTeam: string
  quantity: number
  unit: string
  line: string
  requesterName: string
  receiverName: string | null
  status: RequestStatus
  requestedAt: string
  readyAt: string | null
  pickedUpAt: string | null
}

const ITEMS_PATH = path.join(process.cwd(), "app/items/data.json")
const OUTPUT_PATH = path.join(process.cwd(), "app/output/data.json")
const INPUT_PATH = path.join(process.cwd(), "app/input/data.json")
const DEMAND_PATH = path.join(process.cwd(), "app/output/demand.json")
const REQUESTS_PATH = path.join(process.cwd(), "app/output/requests.json")

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n")
}

function nextId(records: { id: number }[]) {
  return records.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

// Source quantities carry 3 decimals (e.g. LM of welt cord); rounding keeps
// repeated +/- from drifting into values like 822.6239999999999.
function round3(value: number) {
  return Math.round(value * 1000) / 1000
}

export function readItems() {
  return readJson<StockItem[]>(ITEMS_PATH)
}

export function readOutputRecords() {
  return readJson<WarehouseRecord[]>(OUTPUT_PATH)
}

export function readInputRecords() {
  return readJson<WarehouseRecord[]>(INPUT_PATH)
}

export function readDemand() {
  if (!fs.existsSync(DEMAND_PATH)) return []
  return readJson<DemandRecord[]>(DEMAND_PATH)
}

function writeDemand(records: DemandRecord[]) {
  writeJson(DEMAND_PATH, records)
}

// Called from the Warehouse Plan upload (app/plant/actions.ts) to regenerate
// demand.json wholesale from a freshly-dropped MSS print, same as
// `npm run build:output` does from ref/*.xlsb — see the Output-data rules in
// CLAUDE.md for why demand only ever gets replaced, never merged.
export function replaceDemand(records: Omit<DemandRecord, "id">[]) {
  writeDemand(records.map((r, i) => ({ id: i + 1, ...r })))
}

// A withdrawal fulfills that much of the item's outstanding production
// requirement, so the demand figure counts down as stock goes out. Floored at
// 0 — it never goes negative even if more is withdrawn than was required.
// `npm run build:output` still fully overwrites this file from the latest MSS
// print, so the countdown starts fresh each time a new print lands.
function reduceDemand(itemNumber: string, quantity: number) {
  const demand = readDemand()
  const record = demand.find(
    (d) => d.itemNumber.toLowerCase() === itemNumber.toLowerCase()
  )
  if (!record) return
  record.quantity = Math.max(0, round3(record.quantity - quantity))
  writeDemand(demand)
}

export function readTrackLog(): TrackLogRecord[] {
  const records = [...readInputRecords(), ...readOutputRecords()]
  const time = (r: TrackLogRecord) => Date.parse(r.date) || 0
  return records.sort((a, b) => time(b) - time(a))
}

export function findItem(items: StockItem[], itemNumber: string) {
  const normalized = itemNumber.trim().toLowerCase()
  return items.find((item) => item.itemNumber.toLowerCase() === normalized)
}

export function withdrawFromWarehouse(itemNumber: string, rawQuantity: number) {
  const quantity = round3(rawQuantity)
  const items = readItems()
  const item = findItem(items, itemNumber)
  if (!item) {
    return { error: `No item found with number "${itemNumber}".` }
  }
  if (item.quantity < quantity) {
    return {
      error: `Only ${item.quantity.toLocaleString()} ${item.unit} of ${item.itemNumber} in stock.`,
    }
  }

  item.quantity = round3(item.quantity - quantity)
  writeJson(ITEMS_PATH, items)

  const output = readOutputRecords()
  output.push({
    id: nextId(output),
    itemNumber: item.itemNumber,
    description: item.description,
    material: item.material,
    supTeam: item.supTeam,
    quantity,
    unit: item.unit,
    date: new Date().toISOString(),
    type: "out",
  })
  writeJson(OUTPUT_PATH, output)
  reduceDemand(item.itemNumber, quantity)

  return { success: `Withdrew ${quantity.toLocaleString()} ${item.unit} of ${item.itemNumber}.` }
}

export function receiveIntoWarehouse(itemNumber: string, rawQuantity: number) {
  const quantity = round3(rawQuantity)
  const items = readItems()
  const item = findItem(items, itemNumber)
  if (!item) {
    return { error: `No item found with number "${itemNumber}".` }
  }

  item.quantity = round3(item.quantity + quantity)
  writeJson(ITEMS_PATH, items)

  const input = readInputRecords()
  input.push({
    id: nextId(input),
    itemNumber: item.itemNumber,
    description: item.description,
    material: item.material,
    supTeam: item.supTeam,
    quantity,
    unit: item.unit,
    date: new Date().toISOString(),
    type: "in",
  })
  writeJson(INPUT_PATH, input)

  return { success: `Received ${quantity.toLocaleString()} ${item.unit} of ${item.itemNumber}.` }
}

export function readRequests() {
  if (!fs.existsSync(REQUESTS_PATH)) return []
  return readJson<WarehouseRequest[]>(REQUESTS_PATH)
}

function writeRequests(requests: WarehouseRequest[]) {
  writeJson(REQUESTS_PATH, requests)
}

export function createRequest(
  itemNumber: string,
  rawQuantity: number,
  line: string,
  requesterName: string
) {
  const quantity = round3(rawQuantity)
  const items = readItems()
  const item = findItem(items, itemNumber)
  if (!item) {
    return { error: `No item found with number "${itemNumber}".` }
  }

  const requests = readRequests()
  requests.push({
    id: nextId(requests),
    itemNumber: item.itemNumber,
    description: item.description,
    material: item.material,
    supTeam: item.supTeam,
    quantity,
    unit: item.unit,
    line,
    requesterName,
    receiverName: null,
    status: "pending",
    requestedAt: new Date().toISOString(),
    readyAt: null,
    pickedUpAt: null,
  })
  writeRequests(requests)

  return { success: `Requested ${quantity.toLocaleString()} ${item.unit} of ${item.itemNumber}.` }
}

// Warehouse staff (the receiver) prepares the item and marks it ready — this
// is the point at which the requester should be told to come pick it up.
export function markRequestReady(requestId: number, receiverName: string) {
  const requests = readRequests()
  const request = requests.find((r) => r.id === requestId)
  if (!request) {
    return { error: "Request not found." }
  }
  if (request.status !== "pending") {
    return { error: "Only a pending request can be marked ready." }
  }

  request.status = "ready"
  request.receiverName = receiverName
  request.readyAt = new Date().toISOString()
  writeRequests(requests)

  return { success: `${request.itemNumber} is ready for ${request.requesterName} to pick up.` }
}

// Stock is only deducted here, when the requester actually collects the
// item — not when the request is made or marked ready.
export function confirmRequestPickup(requestId: number) {
  const requests = readRequests()
  const request = requests.find((r) => r.id === requestId)
  if (!request) {
    return { error: "Request not found." }
  }
  if (request.status !== "ready") {
    return { error: "Only a ready request can be picked up." }
  }

  const result = withdrawFromWarehouse(request.itemNumber, request.quantity)
  if (result.error) {
    return result
  }

  request.status = "picked_up"
  request.pickedUpAt = new Date().toISOString()
  writeRequests(requests)

  return { success: `${request.itemNumber} picked up by ${request.requesterName}.` }
}
