import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function StatusBadge({
  icon: Icon,
  className,
  children,
}: {
  icon?: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      {Icon && <Icon className="size-3 shrink-0" />}
      {children}
    </span>
  )
}