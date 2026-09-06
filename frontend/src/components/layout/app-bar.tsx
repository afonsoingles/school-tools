"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { navigation } from "@/lib/navigation"

function sectionTitle(pathname: string): string {
  if (pathname.startsWith("/admin")) return "Admin"
  if (pathname.startsWith("/settings/subjects")) return "Subjects"
  if (pathname.startsWith("/settings/calendar")) return "Calendar"
  if (pathname.startsWith("/settings")) return "Settings"
  for (const item of navigation) {
    if (pathname.startsWith(item.href)) return item.title
  }
  return "School Tools"
}

export function AppBar() {
  const pathname = usePathname()

  return (
    <header
      data-slot="app-bar"
      className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 pt-[env(safe-area-inset-top)] md:hidden"
    >
      <SidebarTrigger className="size-9" />
      <Link href="/dashboard" className="flex shrink-0" aria-label="Go to dashboard">
        <Image src="/logo.png" alt="School Tools" width={32} height={32} />
      </Link>
      <span className="truncate text-sm font-semibold text-foreground">{sectionTitle(pathname)}</span>
    </header>
  )
}