"use client"

import * as React from "react"
import { useActionState } from "react"
import { FileSpreadsheetIcon, Loader2Icon, UploadCloudIcon } from "lucide-react"

import { processPlantFileAction, type PlantActionState } from "@/app/plant/actions"
import { PlantCategoryCard } from "@/components/plant-category-card"
import { PlantDownloadButton } from "@/components/plant-download-button"
import { PlantPreviewTable } from "@/components/plant-preview-table"
import { useTranslation } from "@/components/language-provider"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const initialState: PlantActionState = {}

export function PlantUploader() {
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState(processPlantFileAction, initialState)
  const formRef = React.useRef<HTMLFormElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [dragActive, setDragActive] = React.useState(false)

  function submitFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file || !inputRef.current) return
    // Sync the dropped/picked file onto the real <input type="file"> so the
    // form's native FormData collection (and progressive enhancement) picks
    // it up exactly like a normal file-input submit would.
    const transfer = new DataTransfer()
    transfer.items.add(file)
    inputRef.current.files = transfer.files
    setFileName(file.name)
    formRef.current?.requestSubmit()
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.plant.dropTitle}</CardTitle>
          <CardDescription>{t.plant.dropDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction}>
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept=".xlsx,.xlsb"
              className="hidden"
              onChange={(e) => submitFiles(e.target.files)}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  inputRef.current?.click()
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                submitFiles(e.dataTransfer.files)
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
              }`}
            >
              {pending ? (
                <>
                  <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t.plant.processing(fileName ?? "file")}
                  </p>
                </>
              ) : (
                <>
                  {fileName ? (
                    <FileSpreadsheetIcon className="size-8 text-muted-foreground" />
                  ) : (
                    <UploadCloudIcon className="size-8 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium">
                    {fileName ?? t.plant.dropHint}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.plant.fileTypeHint}</p>
                </>
              )}
            </div>
          </form>
          {state.error ? (
            <p className="mt-3 text-sm text-destructive">{state.error}</p>
          ) : null}
        </CardContent>
      </Card>

      {state.result ? (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{state.result.fileName}</CardTitle>
              <CardDescription>
                {t.plant.sheetRowsRead(state.result.sheetName, state.result.totalMobomRows)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p className="text-emerald-600 dark:text-emerald-400">
                {t.plant.demandUpdated(state.result.demandItemCount)}
              </p>
              {state.result.warnings.map((warning, i) => (
                <p key={i} className="text-muted-foreground">
                  {warning}
                </p>
              ))}
            </CardContent>
          </Card>

          {state.result.categories.map((category) => (
            <PlantCategoryCard key={category.id} category={category} />
          ))}

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{t.plant.unclassifiedTitle}</CardTitle>
                <CardDescription>
                  {t.plant.unclassifiedDescription(state.result.unclassified.rowCount)}
                </CardDescription>
              </div>
              <PlantDownloadButton
                base64={state.result.unclassified.downloadBase64}
                fileName={state.result.unclassified.downloadFileName}
                disabled={state.result.unclassified.rowCount === 0}
              />
            </CardHeader>
            <CardContent>
              <PlantPreviewTable
                columns={state.result.unclassified.previewColumns}
                rows={state.result.unclassified.previewRows}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
