"use client"

import * as React from "react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ItemNumberField, type ItemOption } from "@/components/item-number-field"
import { useTranslation } from "@/components/language-provider"
import type { WarehouseActionState } from "@/app/warehouse/actions"
import { CheckCircle2Icon, ClipboardListIcon, TriangleAlertIcon, XCircleIcon } from "lucide-react"

const initialState: WarehouseActionState = {}

export function RequestFormCard({
  action,
  items,
  fixedLine,
}: {
  action: (
    prevState: WarehouseActionState,
    formData: FormData
  ) => Promise<WarehouseActionState>
  items: ItemOption[]
  // When set (a logged-in production-line account), the line is fixed to the
  // account's own line instead of being a free-text field.
  fixedLine?: string
}) {
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState(action, initialState)
  const formRef = React.useRef<HTMLFormElement>(null)
  const [itemNumber, setItemNumber] = React.useState("")
  const [quantity, setQuantity] = React.useState("")

  React.useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setItemNumber("")
      setQuantity("")
    }
  }, [state.success])

  const selectedItem = React.useMemo(
    () =>
      items.find((item) => item.itemNumber.toLowerCase() === itemNumber.trim().toLowerCase()),
    [items, itemNumber]
  )
  const requestedQuantity = Number(quantity)

  // "Almost out" means there's enough to fulfill this request, but not much
  // margin left over afterward (less than 20% of what was just requested).
  let stockLevel: "green" | "amber" | "red" | null = null
  let availableQuantity: number | null = null
  if (
    selectedItem &&
    selectedItem.quantity !== undefined &&
    Number.isFinite(requestedQuantity) &&
    requestedQuantity > 0
  ) {
    availableQuantity = selectedItem.quantity
    const remaining = selectedItem.quantity - requestedQuantity
    if (remaining < 0) {
      stockLevel = "red"
    } else if (remaining < requestedQuantity * 0.2) {
      stockLevel = "amber"
    } else {
      stockLevel = "green"
    }
  }

  const stockLevelStyles = {
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-destructive",
  } as const
  const stockLevelIcon = {
    green: <CheckCircle2Icon className="size-4" />,
    amber: <TriangleAlertIcon className="size-4" />,
    red: <XCircleIcon className="size-4" />,
  } as const
  const stockLevelLabel = {
    green: t.request.inStock,
    amber: t.request.almostOutOfStock,
    red: t.request.notEnoughInStock,
  } as const

  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardTitle>{t.request.formTitle}</CardTitle>
        <CardAction>
          <ClipboardListIcon className="text-muted-foreground size-5" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          id="request-form"
          action={formAction}
          className="flex flex-col gap-3"
        >
          <ItemNumberField
            id="request-item-number"
            name="itemNumber"
            items={items}
            required
            value={itemNumber}
            onValueChange={setItemNumber}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="request-quantity">{t.request.quantityLabel}</Label>
            <Input
              id="request-quantity"
              name="quantity"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {stockLevel && availableQuantity !== null ? (
              <p className={`flex items-center gap-1.5 text-sm ${stockLevelStyles[stockLevel]}`}>
                {stockLevelIcon[stockLevel]}
                {stockLevelLabel[stockLevel]}{" "}
                {t.request.available(availableQuantity.toLocaleString(), selectedItem?.unit)}
              </p>
            ) : null}
          </div>
          {fixedLine ? (
            <input type="hidden" name="line" value={fixedLine} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="request-line">{t.request.lineLabel}</Label>
              <Input id="request-line" name="line" placeholder={t.request.linePlaceholder} required />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="request-name">{t.request.requesterLabel}</Label>
            <Input id="request-name" name="requesterName" placeholder={t.request.requesterPlaceholder} required />
          </div>
        </form>
        {state.error ? (
          <p className="text-destructive mt-3 text-sm">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
            {state.success}
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button type="submit" form="request-form" disabled={pending} className="w-full">
          {pending ? t.common.submitting : t.request.submitLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
