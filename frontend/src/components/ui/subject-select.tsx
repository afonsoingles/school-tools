"use client"

import { BookOpen } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { cn } from "@/lib/utils"
import type { Subject } from "@/types"

export function SubjectSelect({
  value,
  onValueChange,
  subjects,
  placeholder = "Select a subject",
  className,
  hideLabel = false,
  labelClassName,
  variant = "form",
}: {
  value: string
  onValueChange: (value: string) => void
  subjects: Subject[]
  placeholder?: string
  className?: string
  hideLabel?: boolean
  labelClassName?: string
  variant?: "form" | "filter"
}) {
  const selected = subjects.find((s) => s.id === value)

  if (variant === "filter") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <Select value={value} onValueChange={(v) => onValueChange(String(v))}>
          <SelectTrigger className="h-9 w-full">
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Subject</span>
              <span className="select-none text-muted-foreground">·</span>
              <SelectValue className="truncate">
                {(v) =>
                  selected ? selected.name : v === "all" || v === "" ? "All" : placeholder
                }
              </SelectValue>
            </span>
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id} label={s.name}>
                <span className="flex items-center gap-1.5">
                  <SubjectIcon icon={s.icon} className="size-3.5 shrink-0 text-muted-foreground" />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {!hideLabel && <Label className={labelClassName}>Subject</Label>}
      <Select value={value} onValueChange={(v) => onValueChange(String(v))}>
        <SelectTrigger className="w-full">
          {selected ? (
            <span className="flex items-center gap-1.5">
              <SubjectIcon icon={selected.icon} className="size-3.5 shrink-0 text-muted-foreground" />
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectTrigger>
        <SelectContent>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id} label={s.name}>
              <span className="flex items-center gap-1.5">
                <SubjectIcon icon={s.icon} className="size-3.5 shrink-0 text-muted-foreground" />
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}