"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, Wrench, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

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

  const tabs = [
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      active: pathname === "/admin/users" || pathname.startsWith("/admin/users/"),
    },
    { href: "/admin/stats", label: "Statistics", icon: BarChart3, active: pathname === "/admin/stats" },
  ]

  return (
    <nav className="px-4 pt-4 pb-2 md:px-8 md:pt-0">
      <div className="flex min-w-max items-center gap-1 overflow-x-auto border-b border-border pb-2 no-scrollbar">
        {tabs.map((tab) => (
          <AdminTab key={tab.href} {...tab} />
        ))}
        {isDev && (
          <Link
            href="/admin/development"
            className={cn(
              "mx-1 flex items-center gap-2 rounded-md border-2 border-dashed border-green-500/50 px-3 py-1.5 text-sm font-semibold transition-colors",
              pathname === "/admin/development"
                ? "text-foreground"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            )}
          >
            <Wrench className="size-4" />
            <span>Development</span>
          </Link>
        )}
      </div>
    </nav>
  )
}