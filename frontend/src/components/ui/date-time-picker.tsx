"use client"

import * as React from "react"
import { CalendarDays, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTimezone } from "@/components/layout/timezone-provider"
import { getTzParts, tzDateFromParts } from "@/lib/date-time"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
}

const DEFAULT_TIME = "23:59"

function formatSelected(d: Date, tz: string): string {
  const date = d.toLocaleDateString("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${date}, ${time}`
}

function timeParts(time: string): { h: number; min: number } {
  const [hRaw, mRaw] = time.split(":").map((n) => parseInt(n, 10))
  return {
    h: Number.isNaN(hRaw) ? 23 : hRaw,
    min: Number.isNaN(mRaw) ? 59 : mRaw,
  }
}

function mergeTime(base: Date | undefined, time: string, tz: string): Date {
  const { h, min } = timeParts(time)
  if (base instanceof Date && !Number.isNaN(base.getTime())) {
    const parts = getTzParts(tz, base)
    return tzDateFromParts(tz, parts.y, parts.m, parts.d, h, min)
  }
  const today = getTzParts(tz, new Date())
  return tzDateFromParts(tz, today.y, today.m, today.d, h, min)
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date & time",
  disabled,
  className,
}: DateTimePickerProps) {
  const timezone = useTimezone()
  const [open, setOpen] = React.useState(false)
  const [time, setTime] = React.useState(() => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const parts = getTzParts(timezone, value)
      return `${String(parts.h).padStart(2, "0")}:${String(parts.min).padStart(2, "0")}`
    }
    return DEFAULT_TIME
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start gap-1.5 px-2.5 text-left font-normal",
              !value && "text-muted-foreground",
              className
            )}
          >
            <CalendarDays className="size-3.5 shrink-0" />
            {value ? (
              formatSelected(value, timezone)
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            if (!d) {
              onChange(undefined)
              return
            }
            const { h, min } = timeParts(time)
            onChange(tzDateFromParts(timezone, d.getFullYear(), d.getMonth() + 1, d.getDate(), h, min))
          }}
          disabled={(date) => {
            if (disabled) return disabled(date)
            const today = getTzParts(timezone, new Date())
            const todayStart = tzDateFromParts(timezone, today.y, today.m, today.d, 0, 0)
            return date.getTime() < todayStart.getTime()
          }}
        />
        <div className="flex flex-col gap-1.5 border-t p-3">
          <Label htmlFor="dtp-time" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            Time
          </Label>
          <div className="relative">
            <Input
              id="dtp-time"
              type="time"
              step="60"
              value={time}
              onChange={(e) => {
                const next = e.target.value
                setTime(next || "23:59")
                onChange(value ? mergeTime(value, next || "23:59", timezone) : undefined)
              }}
              aria-label="Time"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}