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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { ErrorBox } from "@/components/ui/error-box"
import { errorMessage } from "@/lib/errors"
import { createEvaluation } from "@/lib/api/evaluations"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { subjectIconMap, subjectNameMap } from "@/lib/subjects"
import { useTimezone } from "@/components/layout/timezone-provider"
import { getTzParts, toDateTimeInput } from "@/lib/date-time"
import type { ClassEvent, Subject } from "@/types"
import { EVALUATION_TYPE_LABELS } from "./constants"

interface CreateEvaluationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classes: ClassEvent[]
  subjects: Subject[]
  onCreated: () => void
}

export function CreateEvaluationDialog({
  open,
  onOpenChange,
  classes,
  subjects,
  onCreated,
}: CreateEvaluationDialogProps) {
  const timezone = useTimezone()
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [classId, setClassId] = useState("")
  const [type, setType] = useState("exam")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekday = date ? getTzParts(timezone, date).weekday : null
  const classSubjectMap = subjectNameMap(subjects)
  const subjectIcon = subjectIconMap(subjects)
  const subjectIds = new Set(subjects.map((s) => s.id))

  const availableClasses = weekday
    ? classes.filter((c) => c.weekday === weekday && subjectIds.has(c.subject_id))
    : []

  const selectedClass = classes.find((c) => c.id === classId)
  const selectedIcon = selectedClass ? subjectIcon.get(selectedClass.subject_id) ?? "" : ""
  const selectedLabel = selectedClass
    ? `${classSubjectMap.get(selectedClass.subject_id) ?? "Unknown"} · ${selectedClass.start_time} – ${selectedClass.end_time}`
    : null

  function reset() {
    setDate(undefined)
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
      await createEvaluation({ class_id: classId, date: toDateTimeInput(date, timezone), type })
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
            <DateTimePicker
              value={date}
              onChange={(next) => {
                setDate(next)
                setClassId("")
              }}
              dateOnly
              disabled={() => false}
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
                  {classId ? (
                    <span className="flex items-center gap-1.5">
                      <SubjectIcon icon={selectedIcon} className="size-3.5 shrink-0 text-muted-foreground" />
                      {selectedLabel}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select a class</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id} label={classSubjectMap.get(c.subject_id) ?? "Unknown"}>
                      <span className="flex items-center gap-1.5">
                        <SubjectIcon
                          icon={subjectIcon.get(c.subject_id) ?? ""}
                          className="size-3.5 shrink-0 text-muted-foreground"
                        />
                        {classSubjectMap.get(c.subject_id) ?? "Unknown"} · {c.start_time} – {c.end_time}
                      </span>
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
            <ErrorBox>{error}</ErrorBox>
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