"use client"

import { useState } from "react"
import Link from "next/link"
import { Info } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CalendarSyncHintProps {
  className?: string
}

export function CalendarSyncHint({ className }: CalendarSyncHintProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={className}>
      <TooltipProvider>
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger
            className="inline-flex items-center justify-center transition-colors rounded-md outline-none size-8 text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sync your calendar with external apps"
            onClick={() => setOpen((o) => !o)}
          >
            <Info className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <span>
              You can add this calendar to your favorite calendar app in{" "}
              <Link href="/settings/calendar" className="font-medium underline underline-offset-2">
                settings
              </Link>
              .
            </span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}