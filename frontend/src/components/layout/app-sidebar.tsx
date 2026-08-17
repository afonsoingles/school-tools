"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { ShieldCheck } from "lucide-react"

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
} from "@/components/ui/sidebar"
import { UserMenu } from "@/components/layout/user-menu"
import { navigation } from "@/lib/navigation"
import type { User } from "@/types"


export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Image src="/logo.png" loading="eager" alt="School Tools" width={70} height={70}/>
          <span className="text-2xl font-bold tracking-tight leading-none group-data-[collapsible=icon]:hidden">School Tools</span>
        </div>
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
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
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
              tooltip="Admin"
              className="border border-dashed border-amber-500/25 bg-amber-500/10 text-white hover:bg-amber-500/20 hover:text-white hover:border-amber-500/40 data-active:bg-amber-500/15 data-active:text-white"
            >
              <ShieldCheck />
              <span>Admin</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )}

      <SidebarFooter className="border-t border-sidebar-border">
        <UserMenu user={user}/>
      </SidebarFooter>
    </Sidebar>
  )
}