"use client"

import * as React from "react"
import { CalendarDays, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
}

const DEFAULT_TIME = "23:59"

function formatSelected(d: Date): string {
  const date = d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${date}, ${time}`
}

function mergeTime(base: Date | undefined, time: string): Date | undefined {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10))
  const hour = Number.isNaN(h) ? 23 : h
  const minute = Number.isNaN(m) ? 59 : m
  const ref = base instanceof Date && !Number.isNaN(base.getTime()) ? base : new Date()
  const merged = new Date(ref)
  merged.setHours(hour, minute, 0, 0)
  return merged
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date & time",
  disabled,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [time, setTime] = React.useState(() => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
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
              formatSelected(value)
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
            onChange(mergeTime(d, time))
          }}
          disabled={(date) => {
            if (disabled) return disabled(date)
            return date.getTime() < new Date(new Date().toDateString()).getTime()
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
                onChange(value ? mergeTime(value, next || "23:59") : undefined)
              }}
              aria-label="Time"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}