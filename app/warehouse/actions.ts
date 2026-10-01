"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/get-session"
import {
  confirmRequestPickup,
  createRequest,
  markRequestReady,
  receiveIntoWarehouse,
  withdrawFromWarehouse,
} from "@/lib/warehouse"

export type WarehouseActionState = {
  error?: string
  success?: string
}

function parseInput(formData: FormData): { itemNumber: string; quantity: number } | { error: string } {
  const itemNumber = String(formData.get("itemNumber") ?? "").trim()
  const quantityRaw = String(formData.get("quantity") ?? "").trim()
  const quantity = Number(quantityRaw)

  if (!itemNumber) {
    return { error: "Enter an item number." }
  }
  if (!quantityRaw || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Enter a quantity greater than 0." }
  }

  return { itemNumber, quantity }
}

export async function withdrawStockAction(
  _prevState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const session = await requireSession()
  if (session.role === "line") return { error: "Not authorized." }

  const parsed = parseInput(formData)
  if ("error" in parsed) return parsed

  const result = withdrawFromWarehouse(parsed.itemNumber, parsed.quantity)
  if (result.success) {
    revalidatePath("/output")
    revalidatePath("/items")
    revalidatePath("/input")
    revalidatePath("/wip")
  }
  return result
}

export async function receiveStockAction(
  _prevState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const session = await requireSession()
  if (session.role === "line") return { error: "Not authorized." }

  const parsed = parseInput(formData)
  if ("error" in parsed) return parsed

  const result = receiveIntoWarehouse(parsed.itemNumber, parsed.quantity)
  if (result.success) {
    revalidatePath("/input")
    revalidatePath("/items")
    revalidatePath("/output")
    revalidatePath("/wip")
  }
  return result
}

export async function createRequestAction(
  _prevState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const session = await requireSession()
  if (session.role === "warehouse") return { error: "Not authorized." }

  const parsed = parseInput(formData)
  if ("error" in parsed) return parsed

  // A line account can only request for its own line, regardless of what the
  // (hidden) form field says.
  const line =
    session.role === "line" ? session.line! : String(formData.get("line") ?? "").trim()
  const requesterName = String(formData.get("requesterName") ?? "").trim()
  if (!line) return { error: "Enter the requesting line." }
  if (!requesterName) return { error: "Enter the requester's name." }

  const result = createRequest(parsed.itemNumber, parsed.quantity, line, requesterName)
  if (result.success) {
    revalidatePath("/request")
    revalidatePath("/output")
  }
  return result
}

export async function markRequestReadyAction(
  _prevState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const session = await requireSession()
  if (session.role === "line") return { error: "Not authorized." }

  const requestId = Number(formData.get("requestId"))
  const receiverName = String(formData.get("receiverName") ?? "").trim()
  if (!Number.isFinite(requestId)) return { error: "Invalid request." }
  if (!receiverName) return { error: "Enter the receiver's name." }

  const result = markRequestReady(requestId, receiverName)
  if (result.success) {
    revalidatePath("/output")
  }
  return result
}

export async function confirmPickupAction(
  _prevState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const session = await requireSession()
  if (session.role === "line") return { error: "Not authorized." }

  const requestId = Number(formData.get("requestId"))
  if (!Number.isFinite(requestId)) return { error: "Invalid request." }

  const result = confirmRequestPickup(requestId)
  if (result.success) {
    revalidatePath("/output")
    revalidatePath("/items")
    revalidatePath("/input")
    revalidatePath("/wip")
  }
  return result
}
