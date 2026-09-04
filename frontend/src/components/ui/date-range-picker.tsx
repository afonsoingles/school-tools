"use client"

import { CalendarDays, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface DateRange {
  from: Date
  to?: Date
}

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
}

function formatRange(value: DateRange): string {
  const from = value.from.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  if (!value.to) return from
  const to = value.to.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  return `${from} – ${to}`
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a range",
  className,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5 px-2.5 font-normal",
              !value && "text-muted-foreground",
              className
            )}
          >
            <CalendarDays className="size-3.5 shrink-0" />
            <span className="truncate">{value ? formatRange(value) : placeholder}</span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={value ? { from: value.from, to: value.to } : undefined}
          onSelect={(range) => {
            if (!range?.from) {
              onChange(undefined)
              return
            }
            onChange({ from: range.from, to: range.to })
          }}
          numberOfMonths={2}
        />
        {value && (
          <div className="flex items-center justify-end p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(undefined)}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}