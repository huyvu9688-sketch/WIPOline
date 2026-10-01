import { AppSidebar } from "@/components/app-sidebar"
import { OutputTable } from "@/components/output-table"
import { RequestsTable } from "@/components/requests-table"
import { TrackLogTable } from "@/components/track-log-table"
import { SiteHeader } from "@/components/site-header"
import { Card } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  confirmPickupAction,
  markRequestReadyAction,
} from "@/app/warehouse/actions"
import { requireSession } from "@/lib/get-session"
import { getT } from "@/lib/i18n/locale"
import { readDemand, readOutputRecords, readRequests } from "@/lib/warehouse"

export default async function Page() {
  const session = await requireSession()
  const data = readOutputRecords()
  const demand = readDemand()
  const requests = readRequests()
  const pendingCount = requests.filter((r) => r.status === "pending").length
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
        <SiteHeader title={t.output.pageTitle} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {pendingCount > 0 ? (
                <div className="mx-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 lg:mx-6 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {t.output.pendingBanner(pendingCount)}
                </div>
              ) : null}
              <Card className="mx-4 lg:mx-6">
                <RequestsTable
                  data={requests}
                  markReadyAction={markRequestReadyAction}
                  confirmPickupAction={confirmPickupAction}
                />
              </Card>
              <div className="px-4 lg:px-6">
                <h2 className="text-base font-semibold">{t.output.trackLogHeading}</h2>
                <p className="text-sm text-muted-foreground">
                  {t.output.trackLogDescription}
                </p>
              </div>
              <Card className="mx-4 lg:mx-6">
                <TrackLogTable data={data} />
              </Card>
              <div className="px-4 lg:px-6">
                <h2 className="text-base font-semibold">{t.output.demandHeading}</h2>
                <p className="text-sm text-muted-foreground">
                  {t.output.demandDescription}
                </p>
              </div>
              <OutputTable data={demand} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
