"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { Hammer } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { UserMenu } from "@/components/layout/user-menu"
import { navigation } from "@/lib/navigation"
import type { User } from "@/types"


export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const t = useTranslations("nav")
  const { openMobile, setOpenMobile } = useSidebar()

  function handleNavigate() {
    if (openMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/dashboard" onClick={handleNavigate} className="flex items-center gap-3 px-2 py-1.5">
          <Image src="/logo.png" loading="eager" alt="School Tools" width={70} height={70}/>
          <span className="text-2xl font-bold tracking-tight leading-none whitespace-nowrap group-data-[collapsible=icon]:hidden">School Tools</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={t(item.key)}
                      onClick={handleNavigate}
                    >
                      <item.icon />
                      <span>{t(item.key)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {user.admin && (
        <SidebarMenu className="px-2 pb-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/admin" />}
              isActive={pathname.startsWith("/admin")}
              tooltip={t("admin")}
              onClick={handleNavigate}
              className="border-2 border-dashed border-amber-500/40 bg-transparent text-white hover:border-amber-500/60 hover:bg-transparent hover:text-white data-active:border-amber-500/70 data-active:bg-transparent data-active:text-white"
            >
              <Hammer />
              <span>{t("admin")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )}

      <SidebarFooter className="border-t border-sidebar-border max-md:pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-1 pr-1 max-md:pr-[env(safe-area-inset-right)]">
          <NotificationBell side="bottom" align="start" className="shrink-0" />
          <UserMenu user={user} />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}