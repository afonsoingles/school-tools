"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
} from "@/components/ui/sidebar"
import type { User } from "@/types"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function UserMenu({ user }: { user: User }) {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" })
    } finally {
      Sentry.setUser(null)
      router.push("/auth/login")
      router.refresh()
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="w-8 h-8 rounded-md">
              <AvatarFallback className="text-xs rounded-md bg-sidebar-accent">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-sm leading-tight text-left">
              <span className="font-medium truncate">{user.name}</span>
              <span className="text-xs truncate text-sidebar-foreground/60">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto opacity-50 size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent className="rounded-lg min-w-56" side="top" align="end" sideOffset={4}>
            <DropdownMenuItem
              render={<Link href="/settings" />}
            >
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}