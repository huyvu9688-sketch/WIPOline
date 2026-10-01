"use client"

import * as React from "react"

import { NavMain, type NavMainItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useTranslation } from "@/components/language-provider"
import { LayoutDashboardIcon, PackageIcon, PackagePlusIcon, ClipboardListIcon, ClipboardCheckIcon, CommandIcon, WarehouseIcon, FactoryIcon } from "lucide-react"

import type { Role } from "@/lib/auth"
import type { Dictionary } from "@/lib/i18n/dictionaries"

const ROLE_LABEL_KEYS: Record<Role, keyof Dictionary["nav"]> = {
  admin: "roleAdmin",
  warehouse: "roleWarehouse",
  line: "roleLine",
}

// Every nav entry declares which roles see it; admin always sees everything.
function navMainItems(t: Dictionary): (NavMainItem & { roles: Role[] })[] {
  return [
    {
      title: t.nav.dashboard,
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      roles: ["admin", "warehouse"],
    },
    {
      title: t.nav.items,
      url: "/items",
      icon: <PackageIcon />,
      roles: ["admin", "warehouse"],
    },
    {
      title: t.nav.wip,
      url: "/wip",
      icon: <WarehouseIcon />,
      roles: ["admin", "warehouse"],
    },
    {
      title: t.nav.output,
      url: "/output",
      icon: <ClipboardListIcon />,
      roles: ["admin", "warehouse"],
    },
    {
      title: t.nav.input,
      url: "/input",
      icon: <PackagePlusIcon />,
      roles: ["admin", "warehouse"],
    },
    {
      title: t.nav.plant,
      url: "/plant",
      icon: <FactoryIcon />,
      roles: ["admin", "warehouse"],
    },
    {
      title: t.nav.request,
      url: "/request",
      icon: <ClipboardCheckIcon />,
      roles: ["admin", "line"],
    },
  ]
}

export function AppSidebar({
  username,
  role,
  ...props
}: React.ComponentProps<typeof Sidebar> & { username: string; role: Role }) {
  const { t } = useTranslation()
  const homeUrl = role === "line" ? "/request" : "/dashboard"
  const navMain = navMainItems(t).filter((item) => item.roles.includes(role))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href={homeUrl} />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">{t.common.appName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: username, email: t.nav[ROLE_LABEL_KEYS[role]], avatar: "/avatars/shadcn.jpg" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
