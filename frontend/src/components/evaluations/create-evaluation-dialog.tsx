"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

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
import { datePart, getTzParts, toDateTimeInput } from "@/lib/date-time"
import { evaluationTypeLabel } from "@/lib/evaluations"
import type { ClassEvent, ClassSchedule, Subject } from "@/types"

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
  const t = useTranslations("evaluations")
  const tCommon = useTranslations("common")
  const timezone = useTimezone()
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [classId, setClassId] = useState("")
  const [type, setType] = useState("exam")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekday = date ? getTzParts(timezone, date).weekday : null
  const dateStr = date ? datePart(toDateTimeInput(date, timezone)) : null
  const classSubjectMap = subjectNameMap(subjects)
  const subjectIcon = subjectIconMap(subjects)
  const subjectIds = new Set(subjects.map((s) => s.id))

  function isScheduleActiveOn(s: ClassSchedule, day: string): boolean {
    return s.valid_from <= day && (!s.valid_until || day <= s.valid_until)
  }

  function activeSchedule(c: ClassEvent, day: string, wd: number): ClassSchedule | undefined {
    return c.schedules.find(
      (s) => s.scheduled_weekday === wd && isScheduleActiveOn(s, day)
    )
  }

  function timeRangeFor(c: ClassEvent, day: string, wd: number): string | null {
    const s = activeSchedule(c, day, wd)
    return s ? `${s.start_time} – ${s.end_time}` : null
  }

  const availableClasses = weekday && dateStr
    ? classes.filter(
        (c) => subjectIds.has(c.subject_id) && !!activeSchedule(c, dateStr, weekday)
      )
    : []

  const selectedClass = classes.find((c) => c.id === classId)
  const selectedIcon = selectedClass ? subjectIcon.get(selectedClass.subject_id) ?? "" : ""
  const selectedTimeRange = selectedClass && weekday && dateStr
    ? timeRangeFor(selectedClass, dateStr, weekday)
    : null
  const selectedLabel = selectedClass
    ? `${classSubjectMap.get(selectedClass.subject_id) ?? t("unknownSubject")}${selectedTimeRange ? ` · ${selectedTimeRange}` : ""}`
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
      toast.success(t("createdSuccess"))
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
            <DialogTitle>{t("newEvaluation")}</DialogTitle>
            <DialogDescription>{t("create.description")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label>{tCommon("fields.date")}</Label>
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
            <Label>{tCommon("fields.class")}</Label>
            {!date ? (
              <p className="text-sm text-muted-foreground">{t("create.selectDateFirst")}</p>
            ) : availableClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("create.noClassesWeekday")}
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
                    <span className="text-muted-foreground">{t("create.selectClass")}</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id} label={classSubjectMap.get(c.subject_id) ?? t("unknownSubject")}>
                      <span className="flex items-center gap-1.5">
                        <SubjectIcon
                          icon={subjectIcon.get(c.subject_id) ?? ""}
                          className="size-3.5 shrink-0 text-muted-foreground"
                        />
                        {classSubjectMap.get(c.subject_id) ?? t("unknownSubject")}
                        {weekday && dateStr ? ` · ${timeRangeFor(c, dateStr, weekday) ?? ""}` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{tCommon("fields.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(String(v))}>
              <SelectTrigger>
                {evaluationTypeLabel(t, type)}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exam" label={t("type.exam")}>{t("type.exam")}</SelectItem>
                <SelectItem value="quiz" label={t("type.quiz")}>{t("type.quiz")}</SelectItem>
                <SelectItem value="other" label={t("type.other")}>{t("type.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <ErrorBox>{error}</ErrorBox>
          )}

          <Button type="submit" disabled={loading || !classId || !date} className="gap-1.5">
            {loading && <Loader2 className="size-4 animate-spin" />}
            {tCommon("actions.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}