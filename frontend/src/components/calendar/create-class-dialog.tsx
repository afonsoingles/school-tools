"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Subject } from "@/types"
import { createClass } from "@/lib/api/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const WEEKDAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

interface CreateClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  defaultWeekday?: number
  defaultTime?: string
  onCreated: () => void
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
  const [weekday, setWeekday] = useState<string>(defaultWeekday ? String(defaultWeekday) : "")
  const [startTime, setStartTime] = useState(defaultTime ?? "08:00")
  const [endTime, setEndTime] = useState(() => {
    if (defaultTime) {
      const [h, m] = defaultTime.split(":").map(Number)
      const endMin = h * 60 + m + 60
      return `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`
    }
    return "09:00"
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setSubjectId("")
    setWeekday("")
    setStartTime("08:00")
    setEndTime("09:00")
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!subjectId || !weekday) return

    setLoading(true)
    setError(null)

    try {
      await createClass({
        subject_id: subjectId,
        weekday: Number(weekday),
        start_time: startTime,
        end_time: endTime,
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

          <div className="flex flex-col gap-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={(v) => setSubjectId(String(v))}>
              <SelectTrigger>
                {subjectId
                  ? subjects.find((s) => s.id === subjectId)?.name ?? "Select a subject"
                  : <span className="text-muted-foreground">Select a subject</span>}
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id} label={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Day</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={weekday === String(d) ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setWeekday(String(d))}
                >
                  {WEEKDAY_NAMES[d]}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Start time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>End time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          
          <Button type="submit" disabled={loading || !subjectId || !weekday} className="gap-1.5">
            {loading && <Loader2 className="size-4 animate-spin" />}
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
