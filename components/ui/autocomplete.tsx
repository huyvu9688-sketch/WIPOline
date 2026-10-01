"use client"

import * as React from "react"
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete"
import { cn } from "cn"

const Autocomplete = AutocompletePrimitive.Root

function AutocompleteInput({
  className,
  ...props
}: AutocompletePrimitive.Input.Props) {
  return (
    <AutocompletePrimitive.Input
      data-slot="autocomplete-input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none transition-colors selection:bg-primary selection:text-primary-foreground file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function AutocompleteContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  ...props
}: Omit<AutocompletePrimitive.Popup.Props, "children"> &
  Pick<
    AutocompletePrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > &
  Pick<AutocompletePrimitive.List.Props, "children">) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50"
      >
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-content"
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <AutocompletePrimitive.Empty className="px-3 py-2 text-sm text-muted-foreground empty:m-0 empty:p-0" />
          <AutocompletePrimitive.List className="scroll-my-1 p-1">
            {children}
          </AutocompletePrimitive.List>
        </AutocompletePrimitive.Popup>
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  )
}

function AutocompleteItem({
  className,
  children,
  ...props
}: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={cn(
        "flex w-full cursor-default flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </AutocompletePrimitive.Item>
  )
}

export { Autocomplete, AutocompleteInput, AutocompleteContent, AutocompleteItem }
