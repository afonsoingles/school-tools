import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function ErrorBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2", className)}>
      {children}
    </p>
  )
}