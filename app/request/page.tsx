import { AppSidebar } from "@/components/app-sidebar"
import { RequestFormCard } from "@/components/request-form-card"
import { RequestsTable } from "@/components/requests-table"
import { SiteHeader } from "@/components/site-header"
import { Card } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { createRequestAction } from "@/app/warehouse/actions"
import { requireSession } from "@/lib/get-session"
import { getT } from "@/lib/i18n/locale"
import { readItems, readRequests } from "@/lib/warehouse"

export default async function Page() {
  const session = await requireSession()
  const items = readItems()
  const allRequests = readRequests()
  const t = await getT()
  // A line account only ever sees its own line's requests; admin sees every
  // line's requests here (read-only — fulfilling a request stays on Output,
  // a page admin/warehouse-only).
  const requests =
    session.role === "line"
      ? allRequests.filter((r) => r.line === session.line)
      : allRequests

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
        <SiteHeader title={t.request.pageTitle} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="h-full px-4 lg:col-span-1 lg:px-6">
                  <RequestFormCard
                    action={createRequestAction}
                    items={items}
                    fixedLine={session.role === "line" ? session.line : undefined}
                  />
                </div>
                <Card className="lg:col-span-3">
                  <RequestsTable data={requests} />
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
