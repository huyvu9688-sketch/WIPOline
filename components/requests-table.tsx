"use client"

import * as React from "react"
import { useActionState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
} from "lucide-react"

import { useTranslation } from "@/components/language-provider"
import type { WarehouseActionState } from "@/app/warehouse/actions"
import type { Dictionary } from "@/lib/i18n/dictionaries"
import type { RequestStatus, WarehouseRequest } from "@/lib/warehouse"

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function statusBadge(status: RequestStatus, t: Dictionary) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">{t.requests.statusPending}</Badge>
    case "ready":
      return <Badge>{t.requests.statusReady}</Badge>
    case "picked_up":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {t.requests.statusPickedUp}
        </Badge>
      )
  }
}

const initialState: WarehouseActionState = {}

function MarkReadyAction({
  request,
  action,
}: {
  request: WarehouseRequest
  action: (
    prevState: WarehouseActionState,
    formData: FormData
  ) => Promise<WarehouseActionState>
}) {
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="requestId" value={request.id} />
      <div className="flex items-center gap-1.5">
        <Label htmlFor={`receiver-${request.id}`} className="sr-only">
          {t.requests.receiverPlaceholder}
        </Label>
        <Input
          id={`receiver-${request.id}`}
          name="receiverName"
          placeholder={t.requests.receiverPlaceholder}
          required
          className="h-8 w-32"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.common.saving : t.requests.markReady}
        </Button>
      </div>
      {state.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
    </form>
  )
}

function ConfirmPickupAction({
  request,
  action,
}: {
  request: WarehouseRequest
  action: (
    prevState: WarehouseActionState,
    formData: FormData
  ) => Promise<WarehouseActionState>
}) {
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="requestId" value={request.id} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t.requests.confirming : t.requests.confirmPickup}
      </Button>
      {state.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
    </form>
  )
}

export function RequestsTable({
  data,
  markReadyAction,
  confirmPickupAction,
}: {
  data: WarehouseRequest[]
  markReadyAction?: (
    prevState: WarehouseActionState,
    formData: FormData
  ) => Promise<WarehouseActionState>
  confirmPickupAction?: (
    prevState: WarehouseActionState,
    formData: FormData
  ) => Promise<WarehouseActionState>
}) {
  const { t } = useTranslation()
  const canAct = Boolean(markReadyAction && confirmPickupAction)
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<"all" | RequestStatus>("all")
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(20)

  const sorted = React.useMemo(
    () =>
      [...data].sort(
        (a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt)
      ),
    [data]
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted.filter((r) => {
      if (status !== "all" && r.status !== status) return false
      if (!q) return true
      return (
        r.itemNumber.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.line.toLowerCase().includes(q) ||
        r.requesterName.toLowerCase().includes(q)
      )
    })
  }, [sorted, query, status])

  React.useEffect(() => {
    setPageIndex(0)
  }, [query, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = filtered.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Label htmlFor="requests-search" className="sr-only">
            {t.requests.searchLabel}
          </Label>
          <Input
            id="requests-search"
            placeholder={t.requests.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={status}
            onValueChange={(value) => setStatus((value as typeof status) ?? "all")}
            items={[
              { label: t.requests.allStatuses, value: "all" },
              { label: t.requests.statusPending, value: "pending" },
              { label: t.requests.statusReady, value: "ready" },
              { label: t.requests.statusPickedUp, value: "picked_up" },
            ]}
          >
            <SelectTrigger className="w-44" size="sm" id="requests-status-filter">
              <SelectValue placeholder={t.requests.allStatuses} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t.requests.allStatuses}</SelectItem>
                <SelectItem value="pending">{t.requests.statusPending}</SelectItem>
                <SelectItem value="ready">{t.requests.statusReady}</SelectItem>
                <SelectItem value="picked_up">{t.requests.statusPickedUp}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {t.requests.requestCount(filtered.length)}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-40">{t.requests.requestedCol}</TableHead>
              <TableHead className="w-32">{t.requests.statusCol}</TableHead>
              <TableHead className="w-32">{t.common.itemNumberCol}</TableHead>
              <TableHead>{t.common.descriptionCol}</TableHead>
              <TableHead className="w-24 text-end">{t.common.qtyCol}</TableHead>
              <TableHead className="w-20">{t.common.unitCol}</TableHead>
              <TableHead className="w-24">{t.requests.lineCol}</TableHead>
              <TableHead className="w-28">{t.requests.requesterCol}</TableHead>
              <TableHead className="w-28">{t.requests.receiverCol}</TableHead>
              {canAct ? <TableHead className="w-40">{t.requests.actionCol}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.length ? (
              page.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.requestedAt)}
                  </TableCell>
                  <TableCell>{statusBadge(r.status, t)}</TableCell>
                  <TableCell className="font-medium">{r.itemNumber}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {r.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell>{r.unit}</TableCell>
                  <TableCell>{r.line}</TableCell>
                  <TableCell>{r.requesterName}</TableCell>
                  <TableCell>{r.receiverName ?? t.common.dash}</TableCell>
                  {canAct ? (
                    <TableCell>
                      {r.status === "pending" ? (
                        <MarkReadyAction request={r} action={markReadyAction!} />
                      ) : r.status === "ready" ? (
                        <ConfirmPickupAction request={r} action={confirmPickupAction!} />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {formatDate(r.pickedUpAt)}
                        </span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canAct ? 10 : 9} className="h-24 text-center">
                  {t.requests.noRequests}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="requests-rows-per-page" className="text-sm font-medium">
            {t.common.rowsPerPage}
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => setPageSize(Number(value))}
            items={[10, 20, 30, 50, 100].map((size) => ({
              label: `${size}`,
              value: `${size}`,
            }))}
          >
            <SelectTrigger size="sm" className="w-20" id="requests-rows-per-page">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {[10, 20, 30, 50, 100].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          {t.common.pageOf(pageIndex + 1, pageCount)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => setPageIndex(0)}
            disabled={pageIndex === 0}
          >
            <span className="sr-only">{t.common.goToFirstPage}</span>
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
          >
            <span className="sr-only">{t.common.goToPreviousPage}</span>
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
            disabled={pageIndex >= pageCount - 1}
          >
            <span className="sr-only">{t.common.goToNextPage}</span>
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => setPageIndex(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <span className="sr-only">{t.common.goToLastPage}</span>
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
