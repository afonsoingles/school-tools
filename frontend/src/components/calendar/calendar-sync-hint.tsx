"use client"

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
  return (
    <div className={className}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sync your calendar with external apps"
          >
            <Info className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <span>
              You can add this to your personal calendar in{" "}
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