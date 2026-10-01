"use client"

import * as React from "react"

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

export type TrackLogItem = {
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

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

export function TrackLogTable({ data }: { data: TrackLogItem[] }) {
  const { t } = useTranslation()
  const [query, setQuery] = React.useState("")
  const [type, setType] = React.useState("all")
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(20)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((item) => {
      if (type !== "all" && item.type !== type) return false
      if (!q) return true
      return (
        item.itemNumber.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      )
    })
  }, [data, query, type])

  React.useEffect(() => {
    setPageIndex(0)
  }, [query, type])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = filtered.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  )

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Label htmlFor="track-log-search" className="sr-only">
            {t.common.searchItemsLabel}
          </Label>
          <Input
            id="track-log-search"
            placeholder={t.common.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={type}
            onValueChange={(value) => setType(value ?? "all")}
            items={[
              { label: t.trackLog.allTypes, value: "all" },
              { label: t.trackLog.typeIn, value: "in" },
              { label: t.trackLog.typeOut, value: "out" },
            ]}
          >
            <SelectTrigger className="w-40" size="sm" id="track-log-type-filter">
              <SelectValue placeholder={t.trackLog.allTypes} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t.trackLog.allTypes}</SelectItem>
                <SelectItem value="in">{t.trackLog.typeIn}</SelectItem>
                <SelectItem value="out">{t.trackLog.typeOut}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {t.trackLog.recordCount(filtered.length)}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border">
        <div className="max-h-60 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead className="w-44">{t.trackLog.dateCol}</TableHead>
                <TableHead className="w-20">{t.trackLog.typeCol}</TableHead>
                <TableHead className="w-40">{t.common.itemNumberCol}</TableHead>
                <TableHead>{t.common.descriptionCol}</TableHead>
                <TableHead className="w-32 text-end">{t.common.quantityCol}</TableHead>
                <TableHead className="w-24">{t.common.unitCol}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.length ? (
                page.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.type === "in" ? "default" : "secondary"}>
                        {item.type === "in" ? t.trackLog.typeIn : t.trackLog.typeOut}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.itemNumber}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {item.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {t.common.noResults}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {page.length > 4 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent" />
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="track-log-rows-per-page" className="text-sm font-medium">
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
            <SelectTrigger size="sm" className="w-20" id="track-log-rows-per-page">
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
