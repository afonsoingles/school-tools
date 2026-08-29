"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, CalendarDays } from "lucide-react"

const settingsTabs = [
  { href: "/settings/subjects", label: "Subjects", icon: BookOpen },
  { href: "/settings/calendar", label: "Calendar", icon: CalendarDays },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="px-8 pb-2">
      <div className="flex items-center gap-1 border-b border-border pb-2">
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