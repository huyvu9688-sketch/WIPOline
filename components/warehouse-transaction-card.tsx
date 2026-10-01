"use client"

import * as React from "react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ItemNumberField, type ItemOption } from "@/components/item-number-field"
import { useTranslation } from "@/components/language-provider"
import type { WarehouseActionState } from "@/app/warehouse/actions"
import { PackageMinusIcon, PackagePlusIcon } from "lucide-react"

const initialState: WarehouseActionState = {}

export function WarehouseTransactionCard({
  title,
  description,
  action,
  submitLabel,
  variant,
  items,
}: {
  title: string
  description?: string
  action: (
    prevState: WarehouseActionState,
    formData: FormData
  ) => Promise<WarehouseActionState>
  submitLabel: string
  variant: "withdraw" | "receive"
  items: ItemOption[]
}) {
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState(action, initialState)
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
    }
  }, [state.success])

  const Icon = variant === "withdraw" ? PackageMinusIcon : PackagePlusIcon

  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        <CardAction>
          <Icon className="text-muted-foreground size-5" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          id={`${variant}-form`}
          action={formAction}
          className="flex flex-col gap-3"
        >
          <ItemNumberField
            id={`${variant}-item-number`}
            name="itemNumber"
            items={items}
            required
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${variant}-quantity`}>{t.request.quantityLabel}</Label>
            <Input
              id={`${variant}-quantity`}
              name="quantity"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              required
            />
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
        <Button type="submit" form={`${variant}-form`} disabled={pending} className="w-full">
          {pending ? t.common.submitting : submitLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
