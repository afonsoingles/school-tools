"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Bell, BookOpen, CalendarDays, CircleUser, KeyRound, NotebookPen } from "lucide-react"

const settingsTabs = [
  { href: "/settings/account", labelKey: "account", icon: CircleUser },
  { href: "/settings/notifications", labelKey: "notifications", icon: Bell },
  { href: "/settings/test-sheets", labelKey: "testSheets", icon: NotebookPen },
  { href: "/settings/subjects", labelKey: "subjects", icon: BookOpen },
  { href: "/settings/calendar", labelKey: "calendar", icon: CalendarDays },
  { href: "/settings/api-keys", labelKey: "apiKeys", icon: KeyRound },
]

export function SettingsNav() {
  const pathname = usePathname()
  const t = useTranslations("settings.nav")

  return (
    <nav className="px-4 pt-4 pb-2 md:px-8 md:pt-0">
      <div className="flex min-w-max items-center gap-1 overflow-x-auto border-b border-border pb-2 no-scrollbar">
        {settingsTabs.map((tab) => {
          const isActive = pathname === tab.href
          const label = t(tab.labelKey)

          if (isActive) {
            return (
              <span
                key={tab.href}
                aria-current="page"
                className="flex cursor-default items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-foreground"
              >
                <tab.icon className="size-4" />
                <span>{label}</span>
              </span>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <tab.icon className="size-4" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}