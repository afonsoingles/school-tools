"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { Bell, BookOpen, CalendarDays, CircleUser, KeyRound, NotebookPen } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

const settingsTabs = [
  { href: "/settings/account", labelKey: "account", icon: CircleUser },
  { href: "/settings/notifications", labelKey: "notifications", icon: Bell },
  { href: "/settings/test-sheets", labelKey: "testSheets", icon: NotebookPen },
  { href: "/settings/subjects", labelKey: "subjects", icon: BookOpen },
  { href: "/settings/calendar", labelKey: "calendar", icon: CalendarDays },
  { href: "/settings/api-keys", labelKey: "apiKeys", icon: KeyRound },
]

export function SettingsNav({ testSheetsEnabled = true }: { testSheetsEnabled?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations("settings.nav")

  const tabs = useMemo(
    () => settingsTabs.filter((tab) => tab.href !== "/settings/test-sheets" || testSheetsEnabled),
    [testSheetsEnabled]
  )

  const active = useMemo(
    () => tabs.find((tab) => pathname === tab.href) ?? tabs[0],
    [pathname, tabs]
  )
  const ActiveIcon = active.icon

  return (
    <nav className="px-4 pt-4 pb-2 md:px-8 md:pt-0">
      <div className="flex flex-col gap-2 border-b border-border pb-2 md:flex-row md:gap-1">
        <div className="md:hidden">
          <Select value={pathname} onValueChange={(v) => router.push(String(v))}>
            <SelectTrigger className="h-10 w-full">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <ActiveIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t(active.labelKey)}</span>
              </span>
            </SelectTrigger>
            <SelectContent className="w-full">
              {tabs.map((tab) => (
                <SelectItem key={tab.href} value={tab.href} label={t(tab.labelKey)}>
                  <span className="flex items-center gap-1.5">
                    <tab.icon className="size-4 shrink-0" aria-hidden />
                    {t(tab.labelKey)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden min-w-max items-center gap-1 overflow-x-auto no-scrollbar md:flex">
          {tabs.map((tab) => {
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
      </div>
    </nav>
  )
}