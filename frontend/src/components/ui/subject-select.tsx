"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
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
}: {
  value: string
  onValueChange: (value: string) => void
  subjects: Subject[]
  placeholder?: string
  className?: string
  hideLabel?: boolean
  labelClassName?: string
}) {
  const selected = subjects.find((s) => s.id === value)
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