"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"
import { ChevronsUpDown, Loader2, LogOut, Settings } from "lucide-react"

import { UserAvatar } from "@/components/layout/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { User } from "@/types"

export function UserMenu({ user }: { user: User }) {
  const router = useRouter()
  const { setOpenMobile } = useSidebar()
  const [loggingOut, setLoggingOut] = useState(false)

  const closeDrawer = () => setOpenMobile(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" })
    } finally {
      Sentry.setUser(null)
      router.push("/auth/login")
      router.refresh()
    }
  }

  const dropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
          />
        }
      >
        <UserAvatar
          user={user}
          className="w-8 h-8 rounded-md after:hidden!"
          fallbackClassName="text-xs rounded-md bg-sidebar-accent"
        />
        <div className="grid flex-1 text-sm leading-tight text-left">
          <span className="font-medium truncate">{user.name}</span>
          <span className="text-xs truncate text-sidebar-foreground/60">{user.email}</span>
        </div>
        <ChevronsUpDown className="ml-auto opacity-50 size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="rounded-lg min-w-56"
        side="top"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuItem
          render={<Link href="/settings" />}
          onClick={closeDrawer}
        >
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            closeDrawer()
            handleLogout()
          }}
          disabled={loggingOut}
        >
          {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>{dropdown}</SidebarMenuItem>
    </SidebarMenu>
  )
}