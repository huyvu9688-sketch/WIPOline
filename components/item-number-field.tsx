"use client"

import * as React from "react"

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
} from "@/components/ui/autocomplete"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/components/language-provider"

export type ItemOption = {
  itemNumber: string
  description: string
  quantity?: number
  unit?: string
}

function filterItems(item: ItemOption, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    item.itemNumber.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q)
  )
}

export function ItemNumberField({
  id,
  name,
  items,
  required,
  value,
  onValueChange,
}: {
  id: string
  name: string
  items: ItemOption[]
  required?: boolean
  value?: string
  onValueChange?: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <Label htmlFor={id}>{t.itemField.label}</Label>
      <Autocomplete
        items={items}
        name={name}
        required={required}
        value={value}
        onValueChange={onValueChange}
        itemToStringValue={(item: ItemOption) => item.itemNumber}
        filter={filterItems}
        limit={50}
        openOnInputClick
      >
        <AutocompleteInput id={id} placeholder={t.itemField.placeholder} />
        <AutocompleteContent>
          {(item: ItemOption) => (
            <AutocompleteItem key={item.itemNumber} value={item}>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">{item.itemNumber}</span>
                {item.quantity !== undefined ? (
                  <span className="text-xs text-muted-foreground">
                    {item.quantity.toLocaleString()} {item.unit}
                  </span>
                ) : null}
              </div>
              <span className="line-clamp-1 text-xs text-muted-foreground">
                {item.description}
              </span>
            </AutocompleteItem>
          )}
        </AutocompleteContent>
      </Autocomplete>
    </div>
  )
}
