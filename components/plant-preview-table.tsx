"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTranslation } from "@/components/language-provider"

// A plain, dynamic-column preview table — column sets differ too much between
// the plant categories (thread's % splits vs zipper's raw passthrough, etc)
// to reuse items-table.tsx/output-table.tsx's fixed-column shape. No
// sort/filter/pagination here on purpose: this only ever shows a capped
// preview (see PREVIEW_ROW_LIMIT in app/plant/actions.ts) — the full data is
// in the downloadable .xlsx.
export function PlantPreviewTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: (string | number)[][]
}) {
  const { t } = useTranslation()
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{t.plant.noRowsInBucket}</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((value, j) => (
                  <TableCell key={j}>
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
        {t.plant.showingFirstRows(rows.length)}
      </p>
    </div>
  )
}
