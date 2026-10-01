"use client"

import type { PlantCategoryView } from "@/app/plant/actions"
import { PlantDownloadButton } from "@/components/plant-download-button"
import { PlantPreviewTable } from "@/components/plant-preview-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useTranslation } from "@/components/language-provider"

export function PlantCategoryCard({ category }: { category: PlantCategoryView }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{category.label}</CardTitle>
          <CardDescription>{t.plant.matchedRows(category.matchedRowCount)}</CardDescription>
        </div>
        <PlantDownloadButton
          base64={category.downloadBase64}
          fileName={category.downloadFileName}
          label={t.plant.downloadAllSheets}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {category.groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{group.label}</h3>
            <Tabs defaultValue={group.sheets[0]?.id}>
              <TabsList className="flex-wrap">
                {group.sheets.map((sheet) => (
                  <TabsTrigger key={sheet.id} value={sheet.id}>
                    {sheet.label} ({sheet.rowCount.toLocaleString()})
                  </TabsTrigger>
                ))}
              </TabsList>
              {group.sheets.map((sheet) => (
                <TabsContent key={sheet.id} value={sheet.id} className="flex flex-col gap-3 pt-2">
                  {sheet.note ? (
                    <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      {sheet.note}
                    </p>
                  ) : null}
                  <div>
                    <PlantDownloadButton
                      base64={sheet.downloadBase64}
                      fileName={sheet.downloadFileName}
                      disabled={sheet.rowCount === 0}
                    />
                  </div>
                  <PlantPreviewTable columns={sheet.previewColumns} rows={sheet.previewRows} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
