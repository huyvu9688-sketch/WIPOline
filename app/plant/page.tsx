import { AppSidebar } from "@/components/app-sidebar"
import { PlantUploader } from "@/components/plant-uploader"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { requireSession } from "@/lib/get-session"
import { getT } from "@/lib/i18n/locale"

export default async function Page() {
  const session = await requireSession()
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
        <SiteHeader title={t.plant.pageTitle} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
              <PlantUploader />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
