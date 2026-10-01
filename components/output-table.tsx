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

export type OutputItem = {
  id: number
  itemNumber: string
  description: string
  material: string | null
  supTeam: string
  quantity: number
  unit: string
}

export function OutputTable({ data }: { data: OutputItem[] }) {
  const { t } = useTranslation()
  const [query, setQuery] = React.useState("")
  const [material, setMaterial] = React.useState("all")
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(20)

  const materials = React.useMemo(() => {
    const set = new Set<string>()
    for (const item of data) {
      if (item.material) set.add(item.material)
    }
    return Array.from(set).sort()
  }, [data])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((item) => {
      if (material !== "all" && item.material !== material) return false
      if (!q) return true
      return (
        item.itemNumber.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      )
    })
  }, [data, query, material])

  React.useEffect(() => {
    setPageIndex(0)
  }, [query, material])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = filtered.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  )

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Label htmlFor="output-search" className="sr-only">
            {t.common.searchItemsLabel}
          </Label>
          <Input
            id="output-search"
            placeholder={t.common.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={material}
            onValueChange={(value) => setMaterial(value ?? "all")}
            items={[
              { label: t.common.allMaterials, value: "all" },
              ...materials.map((m) => ({ label: m, value: m })),
            ]}
          >
            <SelectTrigger className="w-48" size="sm" id="output-material-filter">
              <SelectValue placeholder={t.common.allMaterials} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t.common.allMaterials}</SelectItem>
                {materials.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {t.common.itemCount(filtered.length)}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-40">{t.common.itemNumberCol}</TableHead>
              <TableHead>{t.common.descriptionCol}</TableHead>
              <TableHead className="w-40">{t.common.materialCol}</TableHead>
              <TableHead className="w-32 text-end">{t.common.quantityCol}</TableHead>
              <TableHead className="w-24">{t.common.unitCol}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.length ? (
              page.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.itemNumber}
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    {item.material ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        {item.material}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">{t.common.dash}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {item.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t.common.noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="output-rows-per-page" className="text-sm font-medium">
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
            <SelectTrigger size="sm" className="w-20" id="output-rows-per-page">
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
