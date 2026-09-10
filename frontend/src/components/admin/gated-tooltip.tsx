"use client"

import { useState, type ReactNode } from "react"
import { BanIcon } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function GatedTooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          render={
            <span
              className="inline-flex"
              onPointerEnter={() => setOpen(true)}
              onPointerLeave={() => setOpen(false)}
            >
              {children}
            </span>
          }
        />
        <TooltipContent>
          <BanIcon className="size-3.5" />
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}