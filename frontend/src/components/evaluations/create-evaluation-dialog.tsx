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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { ApiError } from "@/lib/api/client"
import { createEvaluation } from "@/lib/api/evaluations"
import type { ClassEvent, Subject } from "@/types"
import { EVALUATION_TYPE_LABELS } from "./constants"

interface CreateEvaluationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classes: ClassEvent[]
  subjects: Subject[]
  onCreated: () => void
}

function backendWeekdayFromDate(dateStr: string): number | null {
  if (!dateStr) return null
  const jsDay = new Date(`${dateStr}T00:00:00`).getDay()
  return ((jsDay + 6) % 7) + 1
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null
    return body?.message ?? "Something went wrong. Please try again."
  }
  return "Something went wrong. Please try again."
}

export function CreateEvaluationDialog({
  open,
  onOpenChange,
  classes,
  subjects,
  onCreated,
}: CreateEvaluationDialogProps) {
  const [date, setDate] = useState("")
  const [classId, setClassId] = useState("")
  const [type, setType] = useState("exam")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekday = backendWeekdayFromDate(date)
  const classSubjectMap = new Map(subjects.map((s) => [s.id, s.name]))
  const subjectIds = new Set(subjects.map((s) => s.id))

  const availableClasses = weekday
    ? classes.filter((c) => c.weekday === weekday && subjectIds.has(c.subject_id))
    : []

  const selectedClass = classes.find((c) => c.id === classId)
  const selectedLabel = selectedClass
    ? `${classSubjectMap.get(selectedClass.subject_id) ?? "Unknown"} · ${selectedClass.start_time} – ${selectedClass.end_time}`
    : null

  function reset() {
    setDate("")
    setClassId("")
    setType("exam")
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!classId || !date) return

    setLoading(true)
    setError(null)

    try {
      await createEvaluation({ class_id: classId, date, type })
      onCreated()
      handleOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New evaluation</DialogTitle>
            <DialogDescription>Schedule an exam or quiz on one of your classes.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setClassId("")
              }}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Class</Label>
            {!date ? (
              <p className="text-sm text-muted-foreground">Please select a date first.</p>
            ) : availableClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes occur on this weekday. Pick another date or add a class first.
              </p>
            ) : (
              <Select value={classId} onValueChange={(v) => setClassId(String(v))}>
                <SelectTrigger>
                  {classId
                    ? selectedLabel
                    : <span className="text-muted-foreground">Select a class</span>}
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id} label={classSubjectMap.get(c.subject_id) ?? "Unknown"}>
                      {classSubjectMap.get(c.subject_id) ?? "Unknown"} · {c.start_time} – {c.end_time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(String(v))}>
              <SelectTrigger>
                {EVALUATION_TYPE_LABELS[type] ?? type}
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVALUATION_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} label={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading || !classId || !date} className="gap-1.5">
            {loading && <Loader2 className="size-4 animate-spin" />}
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}