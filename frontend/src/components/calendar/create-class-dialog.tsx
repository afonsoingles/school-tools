"use client"

import { useState } from "react"
import { Loader2, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import type { Subject } from "@/types"
import { createClass } from "@/lib/api/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ErrorBox } from "@/components/ui/error-box"
import { SubjectSelect } from "@/components/ui/subject-select"
import { DAY_NAMES, timeToMinutes } from "@/lib/date-time"

interface CreateClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  defaultWeekday?: number
  defaultTime?: string
  onCreated: () => void
}

interface ScheduleRow {
  weekday: string
  start_time: string
  end_time: string
}

function defaultEndTime(fromTime?: string): string {
  if (!fromTime) return "09:00"
  const min = timeToMinutes(fromTime) + 60
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
}

export function CreateClassDialog({
  open,
  onOpenChange,
  subjects,
  defaultWeekday,
  defaultTime,
  onCreated,
}: CreateClassDialogProps) {
  const [subjectId, setSubjectId] = useState("")
  const [rows, setRows] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setSubjectId("")
    setRows([
      {
        weekday: defaultWeekday ? String(defaultWeekday) : "",
        start_time: defaultTime ?? "08:00",
        end_time: defaultEndTime(defaultTime),
      },
    ])
    setError(null)
  }

  function updateRow(index: number, patch: Partial<ScheduleRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { weekday: "", start_time: "08:00", end_time: "09:00" },
    ])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!subjectId || rows.length === 0) return
    if (rows.some((r) => !r.weekday)) return

    setLoading(true)
    setError(null)

    try {
      await createClass({
        subject_id: subjectId,
        schedules: rows.map((r) => ({
          scheduled_weekday: Number(r.weekday),
          start_time: r.start_time,
          end_time: r.end_time,
        })),
      })
      onCreated()
      onOpenChange(false)
      reset()
    } catch (err) {
      const body = (err as { body?: { message?: string } }).body
      setError(body?.message ?? "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New class</DialogTitle>
            <DialogDescription>Add a class to your schedule</DialogDescription>
          </DialogHeader>

          {subjects.length === 0 ? (
            <div className="flex flex-col gap-1.5 p-4">
              <p className="text-sm text-muted-foreground">
                Please add a subject in settings first before creating a class
              </p>
            </div>
          ) : (
            <>
              <SubjectSelect value={subjectId} onValueChange={setSubjectId} subjects={subjects} placeholder="Select a subject" />

              <div className="flex flex-col gap-2">
                <Label>Schedules</Label>
                {rows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={row.weekday}
                      onValueChange={(v) => updateRow(index, { weekday: String(v) })}
                    >
                      <SelectTrigger className="w-28 shrink-0 justify-center">
                        {row.weekday
                          ? DAY_NAMES[Number(row.weekday) - 1]
                          : <span className="text-muted-foreground">Day</span>}
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((name, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)} label={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      value={row.start_time}
                      onChange={(e) => updateRow(index, { start_time: e.target.value })}
                      required
                      aria-label={`Start time for schedule ${index + 1}`}
                      className="max-md:px-2 max-md:text-sm"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={row.end_time}
                      onChange={(e) => updateRow(index, { end_time: e.target.value })}
                      required
                      aria-label={`End time for schedule ${index + 1}`}
                      className="max-md:px-2 max-md:text-sm"
                    />
                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 hover:bg-foreground/10!"
                        onClick={() => removeRow(index)}
                        aria-label="Remove schedule"
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start gap-1.5"
                  onClick={addRow}
                >
                  <Plus className="size-3.5" />
                  Add schedule
                </Button>
              </div>

              {error && (
                <ErrorBox>{error}</ErrorBox>
              )}

              <Button type="submit" disabled={loading || !subjectId || rows.some((r) => !r.weekday)} className="gap-1.5">
                {loading && <Loader2 className="size-4 animate-spin" />}
                Create
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}