"use client"

import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/components/language-provider"

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

function base64ToBlob(base64: string): Blob {
  const byteChars = atob(base64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i)
  }
  return new Blob([bytes], { type: XLSX_MIME })
}

export function PlantDownloadButton({
  base64,
  fileName,
  label,
  disabled,
}: {
  base64: string
  fileName: string
  label?: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  function handleClick() {
    const blob = base64ToBlob(base64)
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled}
    >
      <DownloadIcon />
      {label ?? t.plant.downloadXlsx}
    </Button>
  )
}
