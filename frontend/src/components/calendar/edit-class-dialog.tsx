"use client"

import { useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
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
import type { ClassEvent, Subject, ClassSchedule } from "@/types"
import {
  addSchedule,
  deleteSchedule,
  reschedule,
  updateClassSubject,
} from "@/lib/api/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ErrorBox } from "@/components/ui/error-box"
import { SubjectSelect } from "@/components/ui/subject-select"
import { dayNamesShort, formatDateDdMmYyyy } from "@/lib/date-time"

interface EditClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cls: ClassEvent | null
  subjects: Subject[]
  onUpdated: () => void
}

interface ScheduleRow {
  id?: string
  weekday: string
  start_time: string
  end_time: string
  ended: boolean
  endedUntil?: string | null
}

function initRows(schedules: ClassSchedule[] = []): ScheduleRow[] {
  return schedules
    .sort((a, b) => a.scheduled_weekday - b.scheduled_weekday || a.start_time.localeCompare(b.start_time))
    .map((s) => ({
      id: s.id,
      weekday: String(s.scheduled_weekday),
      start_time: s.start_time,
      end_time: s.end_time,
      ended: !!s.valid_until,
      endedUntil: s.valid_until,
    }))
}

export function EditClassDialog({ open, onOpenChange, cls, subjects, onUpdated }: EditClassDialogProps) {
  const [subjectId, setSubjectId] = useState(cls?.subject_id ?? "")
  const [rows, setRows] = useState<ScheduleRow[]>(() => initRows(cls?.schedules))
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const t = useTranslations("calendar")
  const tActions = useTranslations("common.actions")
  const locale = useLocale()

  function reset() {
    setSubjectId(cls?.subject_id ?? "")
    setRows(initRows(cls?.schedules))
    setRemovedIds([])
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset()
      onOpenChange(next)
    } else {
      onOpenChange(next)
    }
  }

  function updateRow(index: number, patch: Partial<ScheduleRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { weekday: "", start_time: "08:00", end_time: "09:00", ended: false },
    ])
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }))
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const target = prev[index]
      if (target?.id && !target.ended) setRemovedIds((r) => [...r, target.id as string])
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const editableRows = rows.filter((r) => !r.ended)
    if (!cls || !subjectId || editableRows.length === 0 || editableRows.some((r) => !r.weekday)) return

    setLoading(true)
    setError(null)

    try {
      if (subjectId !== cls.subject_id) {
        await updateClassSubject(cls.id, subjectId)
      }

      for (const row of editableRows) {
        const payload = {
          scheduled_weekday: Number(row.weekday),
          start_time: row.start_time,
          end_time: row.end_time,
        }
        if (row.id) {
          const original = cls.schedules.find((s) => s.id === row.id)
          if (
            !original ||
            original.scheduled_weekday !== payload.scheduled_weekday ||
            original.start_time !== payload.start_time ||
            original.end_time !== payload.end_time
          ) {
            await reschedule(cls.id, row.id, payload)
          }
        } else {
          await addSchedule(cls.id, payload)
        }
      }

      for (const scheduleId of removedIds) {
        await deleteSchedule(cls.id, scheduleId)
      }

      onUpdated()
      onOpenChange(false)
      reset()
    } catch (err) {
      const body = (err as { body?: { message?: string } }).body
      setError(body?.message ?? t("errorUnknown"))
    } finally {
      setLoading(false)
    }
  }

  const editableRows = rows.filter((r) => !r.ended)
  const canSubmit = subjectId !== "" && editableRows.length > 0 && editableRows.every((r) => r.weekday !== "")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("editClass.title")}</DialogTitle>
            <DialogDescription>{t("editClass.description")}</DialogDescription>
          </DialogHeader>

          <SubjectSelect value={subjectId} onValueChange={setSubjectId} subjects={subjects} />

          <div className="flex flex-col gap-2">
            <Label>{t("schedules.label")}</Label>
            <div ref={listRef} className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
              {rows.map((row, index) => {
              if (row.ended) {
                return (
                  <div key={row.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-sm text-muted-foreground">
                    <span className="truncate">
                      {dayNamesShort(locale)[Number(row.weekday) - 1]} · {row.start_time}–{row.end_time}
                    </span>
                    <span className="ml-auto shrink-0 text-[11px]">
                      {t("schedules.endedOn", { date: formatDateDdMmYyyy(row.endedUntil ?? "") })}
                    </span>
                  </div>
                )
              }
              return (
                <div key={row.id ?? `new-${index}`} className="grid grid-cols-[7rem_1fr_auto_1fr_auto] items-center gap-1.5">
                  <Select
                    value={row.weekday}
                    onValueChange={(v) => updateRow(index, { weekday: String(v) })}
                  >
                    <SelectTrigger className="w-full min-w-0 justify-center gap-0 truncate px-2">
                      {row.weekday
                        ? dayNamesShort(locale)[Number(row.weekday) - 1]
                        : <span className="text-muted-foreground">{t("schedules.dayPlaceholder")}</span>}
                    </SelectTrigger>
                    <SelectContent>
                      {dayNamesShort(locale).map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)} label={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={row.start_time}
                    onChange={(e) => updateRow(index, { start_time: e.target.value })}
                    required
                    aria-label={t("schedules.startTimeAria", { index: index + 1 })}
                    className="min-w-0 px-1.5 text-center md:text-sm"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={row.end_time}
                    onChange={(e) => updateRow(index, { end_time: e.target.value })}
                    required
                    aria-label={t("schedules.endTimeAria", { index: index + 1 })}
                    className="min-w-0 px-1.5 text-center md:text-sm"
                  />
                  {editableRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 hover:bg-foreground/10!"
                      onClick={() => removeRow(index)}
                      aria-label={t("schedules.removeAria")}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              )
            })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start gap-1.5"
              onClick={addRow}
            >
              <Plus className="size-3.5" />
              {t("schedules.add")}
            </Button>
          </div>

          {error && (
            <ErrorBox>{error}</ErrorBox>
          )}

          <Button type="submit" disabled={loading || !canSubmit} className="gap-1.5">
            {loading && <Loader2 className="size-4 animate-spin" />}
            {tActions("save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}