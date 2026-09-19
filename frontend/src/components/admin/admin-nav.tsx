"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Megaphone, ScrollText, Trash2, Users, Wrench, type LucideIcon } from "lucide-react"

interface AdminTabProps {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
}

function AdminTab({ href, label, icon: Icon, active }: AdminTabProps) {
  if (active) {
    return (
      <span
        aria-current="page"
        className="flex cursor-default items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-foreground"
      >
        <Icon className="size-4" />
        <span>{label}</span>
      </span>
    )
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </Link>
  )
}

export function AdminNav({ isDev }: { isDev: boolean }) {
  const pathname = usePathname()

  const tabs: AdminTabProps[] = [
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      active: pathname === "/admin/users" || pathname.startsWith("/admin/users/"),
    },
    { href: "/admin/stats", label: "Statistics", icon: BarChart3, active: pathname === "/admin/stats" },
    { href: "/admin/audit", label: "Audit", icon: ScrollText, active: pathname === "/admin/audit" },
    {
      href: "/admin/notifications",
      label: "Notifications",
      icon: Megaphone,
      active: pathname === "/admin/notifications",
    },
    {
      href: "/admin/deletions",
      label: "Deletions",
      icon: Trash2,
      active: pathname === "/admin/deletions",
    },
  ]

  if (isDev) {
    tabs.push({
      href: "/admin/development",
      label: "Development",
      icon: Wrench,
      active: pathname === "/admin/development",
    })
  }

  return (
    <nav className="px-4 pt-4 pb-2 md:px-8 md:pt-0">
      <div className="flex min-w-max items-center gap-1 overflow-x-auto border-b border-border pb-2 no-scrollbar">
        {tabs.map((tab) => (
          <AdminTab key={tab.href} {...tab} />
        ))}
      </div>
    </nav>
  )
}