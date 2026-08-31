"use client"

import { useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
} from "@/components/ui/popover"
import type { CancelledClassEvent } from "@/types"
import { uncancelClass } from "@/lib/api/calendar"

const REASON_LABELS: Record<string, string> = {
  break: "Break",
  public_holiday: "Public holiday",
  other: "Other",
}

const SLOT_HEIGHT = 20

interface CancelledOverlayProps {
  cancellation: CancelledClassEvent
  startTime: string
  endTime: string
  onUncancelled: () => void
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function CancelledOverlay({ cancellation, startTime, endTime, onUncancelled }: CancelledOverlayProps) {
  const [uncanceling, setUncanceling] = useState(false)

  const top = (timeToMinutes(startTime) / 15) * SLOT_HEIGHT
  const height = Math.max(((timeToMinutes(endTime) - timeToMinutes(startTime)) / 15) * SLOT_HEIGHT, 20)

  async function handleUncancel() {
    setUncanceling(true)
    try {
      await uncancelClass(cancellation.id)
      onUncancelled()
    } finally {
      setUncanceling(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        className="absolute left-0.5 right-0.5 flex flex-col justify-center gap-0.5 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-2 text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors z-10"
        style={{ top: `${top}px`, height: `${height}px` }}
      >
        <AlertTriangle className="size-3 shrink-0" />
        <span className="text-[10px] font-medium leading-tight truncate">Cancelled</span>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex flex-col gap-3">
          <PopoverTitle className="text-destructive">Cancelled class</PopoverTitle>
          <p className="text-sm text-muted-foreground">
            Reason: {REASON_LABELS[cancellation.reason] ?? cancellation.reason}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {cancellation.date}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUncancel}
            disabled={uncanceling}
            className="gap-1.5"
          >
            {uncanceling && <Loader2 className="size-3.5 animate-spin" />}
            Uncancel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
