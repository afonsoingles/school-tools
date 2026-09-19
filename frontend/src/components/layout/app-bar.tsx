"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { navigation } from "@/lib/navigation"

export function AppBar() {
  const pathname = usePathname()
  const t = useTranslations("nav")

  let title = t("appName")
  if (pathname.startsWith("/admin")) {
    title = t("admin")
  } else if (pathname.startsWith("/settings/subjects")) {
    title = t("subjects")
  } else if (pathname.startsWith("/settings/calendar")) {
    title = t("calendar")
  } else if (pathname.startsWith("/settings")) {
    title = t("settings")
  } else {
    const item = navigation.find((entry) => pathname.startsWith(entry.href))
    if (item) title = t(item.key)
  }

  return (
    <header
      data-slot="app-bar"
      className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 pt-[env(safe-area-inset-top)] md:hidden"
    >
      <SidebarTrigger className="size-9" />
      <Link href="/dashboard" className="flex shrink-0" aria-label={t("dashboard")}>
        <Image src="/logo.png" alt={t("appName")} width={32} height={32} />
      </Link>
      <span className="truncate text-sm font-semibold text-foreground">{title}</span>
    </header>
  )
}