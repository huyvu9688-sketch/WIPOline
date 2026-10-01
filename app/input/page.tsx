import { AppSidebar } from "@/components/app-sidebar"
import { InputTable } from "@/components/input-table"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { WarehouseTransactionCard } from "@/components/warehouse-transaction-card"
import { receiveStockAction } from "@/app/warehouse/actions"
import { requireSession } from "@/lib/get-session"
import { getT } from "@/lib/i18n/locale"
import { readInputRecords, readItems } from "@/lib/warehouse"

export default async function Page() {
  const session = await requireSession()
  const data = readInputRecords()
  const items = readItems()
  const t = await getT()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" username={session.username} role={session.role} />
      <SidebarInset>
        <SiteHeader title={t.input.pageTitle} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <WarehouseTransactionCard
                  title={t.input.cardTitle}
                  description={t.input.cardDescription}
                  action={receiveStockAction}
                  submitLabel={t.input.submitLabel}
                  variant="receive"
                  items={items}
                />
              </div>
              <InputTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
