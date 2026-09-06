"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, CalendarDays, CircleUser } from "lucide-react"

const settingsTabs = [
  { href: "/settings/account", label: "Account", icon: CircleUser },
  { href: "/settings/subjects", label: "Subjects", icon: BookOpen },
  { href: "/settings/calendar", label: "Calendar", icon: CalendarDays },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="px-4 pt-4 pb-2 md:px-8 md:pt-0">
      <div className="flex min-w-max items-center gap-1 overflow-x-auto border-b border-border pb-2 no-scrollbar">
        {settingsTabs.map((tab) => {
          const isActive = pathname === tab.href

          if (isActive) {
            return (
              <span
                key={tab.href}
                aria-current="page"
                className="flex cursor-default items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-foreground"
              >
                <tab.icon className="size-4" />
                <span>{tab.label}</span>
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
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}