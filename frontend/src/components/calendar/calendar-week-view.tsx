"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  AlertTriangle,
  CalendarMinus2,
  CalendarOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DAY_FULL, DAY_NAMES, formatInTz, getTzParts, timeToMinutes, tzDateFromParts, weekdayFromDateStr } from "@/lib/date-time"
import { subjectIconMap as buildSubjectIconMap, subjectNameMap as buildSubjectNameMap } from "@/lib/subjects"
import { useTimezone } from "@/components/layout/timezone-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { getClassSchedule, uncancelClass, uncancelDay } from "@/lib/api/calendar"
import { getSubjects } from "@/lib/api/settings"
import { EVALUATION_TYPE_LABELS } from "@/components/evaluations/constants"
import { getEvaluations, deleteEvaluation } from "@/lib/api/evaluations"
import type { ClassEvent, ClassSchedule, DayCancellation, Subject, Evaluation } from "@/types"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { REASON_LABELS, SLOT_HEIGHT } from "./constants"
import { CancelClassDialog } from "./cancel-class-dialog"
import { DeleteClassDialog } from "./delete-class-dialog"
import { CreateClassDialog } from "./create-class-dialog"
import { EditClassDialog } from "./edit-class-dialog"
import { DayCancelDialog } from "./day-cancel-dialog"

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const CLASS_COLORS = [
  "bg-blue-600 text-white hover:bg-blue-500",
  "bg-emerald-600 text-white hover:bg-emerald-500",
  "bg-violet-600 text-white hover:bg-violet-500",
  "bg-amber-500 text-white hover:bg-amber-400",
  "bg-cyan-600 text-white hover:bg-cyan-500",
  "bg-fuchsia-600 text-white hover:bg-fuchsia-500",
  "bg-indigo-600 text-white hover:bg-indigo-500",
  "bg-teal-600 text-white hover:bg-teal-500",
]

function DayHeaderAction({
  dateStr,
  dayOff,
  busyId,
  onUndoDay,
  onCancelDay,
}: {
  dateStr: string
  dayOff?: DayCancellation
  busyId: string | null
  onUndoDay: (id: string) => Promise<void>
  onCancelDay: (dateStr: string) => void
}) {
  const [busy, setBusy] = useState(false)

  if (dayOff) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className="hover:bg-foreground/10!"
        aria-label="This day is cancelled. Tap to undo."
        disabled={busy || busyId === dayOff.id}
        onClick={async () => {
          setBusy(true)
          try {
            await onUndoDay(dayOff.id)
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarOff className="size-3.5 text-destructive" />}
      </Button>
    )
  }
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="hover:bg-foreground/10!"
      aria-label="Cancel this day"
      onClick={() => onCancelDay(dateStr)}
    >
      <CalendarMinus2 className="size-3.5 text-muted-foreground" />
    </Button>
  )
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`
}

function getTzCurrentDate(tz: string): { y: number; m: number; d: number; weekdayIndex: number } {
  const p = getTzParts(tz, new Date())
  return { y: p.y, m: p.m, d: p.d, weekdayIndex: p.weekday }
}

function addDaysTz(tz: string, date: Date, days: number): Date {
  const p = getTzParts(tz, date)
  const base = new Date(Date.UTC(p.y, p.m - 1, p.d + days))
  return tzDateFromParts(tz, base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), 0, 0)
}

function getWeekStart(offset: number, tz: string): Date {
  const now = getTzCurrentDate(tz)
  const mondayDelta = now.weekdayIndex - 1 - offset * 7
  const today = tzDateFromParts(tz, now.y, now.m, now.d, 0, 0)
  return addDaysTz(tz, today, -mondayDelta)
}

function formatDateShort(date: Date, tz: string): string {
  return formatInTz(date, tz, { day: "numeric", month: "short" })
}

function tzDateString(p: { y: number; m: number; d: number }): string {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`
}

function isScheduleActiveOn(s: ClassSchedule, dateStr: string): boolean {
  return s.valid_from <= dateStr && (!s.valid_until || dateStr <= s.valid_until)
}

function activeScheduleFor(cls: ClassEvent, dateStr: string): ClassSchedule | undefined {
  const weekday = weekdayFromDateStr(dateStr)
  return cls.schedules.find((s) => isScheduleActiveOn(s, dateStr) && s.scheduled_weekday === weekday)
}

interface DayBlock {
  key: string
  cls: ClassEvent
  schedule: ClassSchedule
  colorIndex: number
}

export function CalendarWeekView() {
  const scrollDesktopRef = useRef<HTMLDivElement>(null)
  const scrollMobileRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const gutterScrollRef = useRef<HTMLDivElement>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [mobileDayOffset, setMobileDayOffset] = useState(0)
  const [classes, setClasses] = useState<ClassEvent[]>([])
  const [dayCancellations, setDayCancellations] = useState<DayCancellation[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  const [cancelDialog, setCancelDialog] = useState<{ cls: ClassEvent; date: string } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ cls: ClassEvent; subjectName: string } | null>(null)
  const [editDialog, setEditDialog] = useState<{ cls: ClassEvent; subjectName: string } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createDefaults, setCreateDefaults] = useState<{ weekday?: number; time?: string }>({})
  const [dayCancelTarget, setDayCancelTarget] = useState<string | null>(null)
  const [uncancelingId, setUncancelingId] = useState<string | null>(null)
  const [deletingEvalId, setDeletingEvalId] = useState<string | null>(null)
  const scrolledWeekRef = useRef<number | null>(null)
  const syncRef = useRef(false)

  const timezone = useTimezone()

  const weekStart = getWeekStart(weekOffset, timezone)
  const todayTz = getTzCurrentDate(timezone)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysTz(timezone, weekStart, i)
    const p = getTzParts(timezone, date)
    return {
      weekday: i + 1,
      date,
      dateStr: tzDateString(p),
      name: DAY_NAMES[i],
      full: DAY_FULL[i],
      dayNum: p.d,
      today: p.y === todayTz.y && p.m === todayTz.m && p.d === todayTz.d,
    }
  })

  const isMobile = useIsMobile()

  const mobileDayDate = addDaysTz(
    timezone,
    tzDateFromParts(timezone, todayTz.y, todayTz.m, todayTz.d, 0, 0),
    mobileDayOffset
  )
  const mobileDay = (() => {
    const p = getTzParts(timezone, mobileDayDate)
    const weekday = p.weekday
    return {
      weekday,
      dateStr: tzDateString(p),
      name: DAY_NAMES[weekday - 1],
      full: DAY_FULL[weekday - 1],
      dayNum: p.d,
      today: p.y === todayTz.y && p.m === todayTz.m && p.d === todayTz.d,
    }
  })()

  const showToday = isMobile ? mobileDayOffset !== 0 : weekOffset !== 0

  function goPrev() {
    if (isMobile) setMobileDayOffset((o) => o - 1)
    else setWeekOffset((o) => o - 1)
  }

  function goNext() {
    if (isMobile) setMobileDayOffset((o) => o + 1)
    else setWeekOffset((o) => o + 1)
  }

  function goToday() {
    setMobileDayOffset(0)
    setWeekOffset(0)
  }

  const subjectMap = buildSubjectNameMap(subjects)
  const subjectIcon = buildSubjectIconMap(subjects)

  const fetchData = useCallback(() => {
    Promise.all([getClassSchedule(), getEvaluations(), getSubjects()])
      .then(([schedule, ev, s]) => {
        setClasses(schedule.classes)
        setDayCancellations(schedule.dayCancellations)
        setEvaluations(ev)
        setSubjects(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function dayBlocks(dateStr: string): DayBlock[] {
    const blocks: DayBlock[] = []
    let colorIndex = 0
    for (const cls of classes) {
      const schedule = activeScheduleFor(cls, dateStr)
      if (schedule) {
        blocks.push({ key: `${cls.id}:${schedule.id}`, cls, schedule, colorIndex })
        colorIndex++
      }
    }
    return blocks
  }

  const earliestWeekTime = (() => {
    let min = Infinity
    for (const day of weekDays) {
      for (const block of dayBlocks(day.dateStr)) {
        const t = timeToMinutes(block.schedule.start_time)
        if (t < min) min = t
      }
    }
    return min
  })()

  useEffect(() => {
    if (loading) return
    if (scrolledWeekRef.current === weekOffset) return
    scrolledWeekRef.current = weekOffset
    if (earliestWeekTime !== Infinity) {
      const target = Math.max(0, ((earliestWeekTime - 30) / 15) * SLOT_HEIGHT)
      if (scrollDesktopRef.current) scrollDesktopRef.current.scrollTop = target
      if (scrollMobileRef.current) scrollMobileRef.current.scrollTop = target
    } else {
      if (scrollDesktopRef.current) scrollDesktopRef.current.scrollTop = 7 * 4 * SLOT_HEIGHT
      if (scrollMobileRef.current) scrollMobileRef.current.scrollTop = 7 * 4 * SLOT_HEIGHT
    }
  }, [weekOffset, loading, earliestWeekTime])

  function classCancellationFor(cls: ClassEvent, dateStr: string) {
    return cls.cancellations.find((c) => c.date === dateStr)
  }

  function dayOffFor(dateStr: string): DayCancellation | undefined {
    return dayCancellations.find((d) => d.date === dateStr)
  }

  function evaluationForDay(classId: string, dateStr: string): Evaluation | undefined {
    return evaluations.find((e) => {
      const eDate = e.date.includes("T") ? e.date.split("T")[0] : e.date
      return e.class_id === classId && eDate === dateStr
    })
  }

  function blockLayout(dayBlocks: DayBlock[]): Map<string, { topMin: number; endMin: number; col: number; total: number; colorIndex: number }> {
    const sorted = [...dayBlocks].sort((a, b) => {
      const sa = timeToMinutes(a.schedule.start_time)
      const sb = timeToMinutes(b.schedule.start_time)
      if (sa !== sb) return sa - sb
      return timeToMinutes(b.schedule.end_time) - timeToMinutes(a.schedule.end_time)
    })

    const clusters: DayBlock[][] = []
    for (const block of sorted) {
      const start = timeToMinutes(block.schedule.start_time)
      const last = clusters[clusters.length - 1]
      const lastMaxEnd = last
        ? Math.max(...last.map((b) => timeToMinutes(b.schedule.end_time)))
        : -1
      if (last && start < lastMaxEnd) {
        last.push(block)
      } else {
        clusters.push([block])
      }
    }

    const layout = new Map<string, { topMin: number; endMin: number; col: number; total: number; colorIndex: number }>()
    for (const cluster of clusters) {
      const sortedCluster = [...cluster].sort(
        (a, b) => timeToMinutes(a.schedule.start_time) - timeToMinutes(b.schedule.start_time)
      )

      const columnEnds: number[] = []
      const perBlock: { block: DayBlock; col: number }[] = []
      for (const block of sortedCluster) {
        const start = timeToMinutes(block.schedule.start_time)
        let col = columnEnds.findIndex((endMin) => endMin <= start)
        if (col === -1) {
          col = columnEnds.length
          columnEnds.push(0)
        }
        columnEnds[col] = Math.max(columnEnds[col], timeToMinutes(block.schedule.end_time))
        perBlock.push({ block, col })
      }
      const total = columnEnds.length

      for (const { block, col } of perBlock) {
        const start = timeToMinutes(block.schedule.start_time)
        const end = timeToMinutes(block.schedule.end_time)
        const nextSameCol = perBlock
          .filter((p) => p.col === col && timeToMinutes(p.block.schedule.start_time) > start)
          .map((p) => timeToMinutes(p.block.schedule.start_time))
          .sort((a, b) => a - b)[0]
        const topMin = start
        const endMin = Math.max(topMin, Math.min(end, nextSameCol ?? end))
        layout.set(block.key, { topMin, endMin, col, total, colorIndex: block.colorIndex })
      }
    }
    return layout
  }

  async function handleUncancelClass(classId: string, cancellationId: string) {
    setUncancelingId(cancellationId)
    try {
      await uncancelClass(classId, cancellationId)
      fetchData()
    } finally {
      setUncancelingId(null)
    }
  }

  async function handleUncancelDay(dayCancellationId: string) {
    setUncancelingId(dayCancellationId)
    try {
      await uncancelDay(dayCancellationId)
      fetchData()
    } finally {
      setUncancelingId(null)
    }
  }

  async function handleDeleteEvaluation(evaluationId: string) {
    setDeletingEvalId(evaluationId)
    try {
      await deleteEvaluation(evaluationId)
      fetchData()
    } finally {
      setDeletingEvalId(null)
    }
  }

  function weekLabel(): string {
    const end = addDaysTz(timezone, weekStart, 6)
    const s = getTzParts(timezone, weekStart)
    const e = getTzParts(timezone, end)
    if (s.m === e.m && s.y === e.y) {
      return `${formatDateShort(weekStart, timezone)} – ${e.d} ${formatInTz(end, timezone, { month: "short", year: "numeric" })}`
    }
    return `${formatDateShort(weekStart, timezone)} – ${formatDateShort(end, timezone)} ${e.y}`
  }

  function syncGridScroll() {
    const g = scrollMobileRef.current
    if (!g || syncRef.current) return
    syncRef.current = true
    try {
      if (headerScrollRef.current && headerScrollRef.current.scrollLeft !== g.scrollLeft) {
        headerScrollRef.current.scrollLeft = g.scrollLeft
      }
      if (gutterScrollRef.current && gutterScrollRef.current.scrollTop !== g.scrollTop) {
        gutterScrollRef.current.scrollTop = g.scrollTop
      }
    } finally {
      syncRef.current = false
    }
  }

  function syncHeaderScroll() {
    const h = headerScrollRef.current
    const g = scrollMobileRef.current
    if (!h || !g || syncRef.current || g.scrollLeft === h.scrollLeft) return
    syncRef.current = true
    g.scrollLeft = h.scrollLeft
    syncRef.current = false
  }

  function syncGutterScroll() {
    const u = gutterScrollRef.current
    const g = scrollMobileRef.current
    if (!u || !g || syncRef.current || g.scrollTop === u.scrollTop) return
    syncRef.current = true
    g.scrollTop = u.scrollTop
    syncRef.current = false
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>, weekday: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const slotIndex = Math.round(y / SLOT_HEIGHT)
    const totalMinutes = slotIndex * 15
    const hour = Math.floor(totalMinutes / 60)
    const min = totalMinutes % 60
    const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`
    setCreateDefaults({ weekday, time })
    setCreateOpen(true)
  }

  function renderHourLabels() {
    return (
      <div className="relative" style={{ height: `${24 * 4 * SLOT_HEIGHT}px` }}>
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute right-0 -top-2 pr-2 text-[10px] text-muted-foreground tabular-nums"
            style={{ top: `${hour * 4 * SLOT_HEIGHT}px` }}
          >
            {formatHour(hour)}
          </div>
        ))}
      </div>
    )
  }

  function renderDayCell(day: { weekday: number; dateStr: string; full: string }) {
    const dayOff = dayOffFor(day.dateStr)
    const blocks = dayBlocks(day.dateStr)
    const layout = blockLayout(blocks)

    return (
      <div
        key={day.dateStr}
        className="relative min-w-0 flex-1 border-l border-border/50"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-slot]")) return
          if (dayOff) return
          handleGridClick(e, day.weekday)
        }}
      >
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-b border-border/30"
            style={{ top: `${hour * 4 * SLOT_HEIGHT}px`, height: `${4 * SLOT_HEIGHT}px` }}
          >
            {[1, 2, 3].map((sub) => (
              <div
                key={sub}
                className="absolute left-0 right-0 border-b border-border/10"
                style={{ top: `${sub * SLOT_HEIGHT}px` }}
              />
            ))}
          </div>
        ))}

        {dayOff && (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-start justify-center pt-6">
            <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-3 py-1 text-xs font-medium text-destructive">
              <CalendarOff className="size-3.5" />
              Day off
            </span>
          </div>
        )}

        {blocks.map((block) => {
          const cls = block.cls
          const cancellation = classCancellationFor(cls, day.dateStr)
          const evaluation = evaluationForDay(cls.id, day.dateStr)
          const subjectName = subjectMap.get(cls.subject_id) ?? "Unknown"
          const isCancelled = !!cancellation || !!dayOff
          const hasEvaluation = !!evaluation
          const band = layout.get(block.key) ?? { topMin: 0, endMin: 60, col: 0, total: 1, colorIndex: 0 }
          const top = (band.topMin / 15) * SLOT_HEIGHT
          const height = Math.max(((band.endMin - band.topMin) / 15) * SLOT_HEIGHT, 20)
          const widthPct = 100 / band.total
          const leftPct = band.col * widthPct
          const times = `${block.schedule.start_time} – ${block.schedule.end_time}`

          return (
            <Popover key={block.key}>
              <PopoverTrigger
                className={cn(
                  "absolute flex flex-col justify-start rounded px-2 pt-1.5 cursor-pointer transition-colors z-10 overflow-hidden",
                  hasEvaluation
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : isCancelled
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : CLASS_COLORS[band.colorIndex % CLASS_COLORS.length],
                )}
                style={{ top: `${top}px`, height: `${height}px`, left: `${leftPct}%`, width: `${widthPct}%` }}
              >
                <span className="flex items-center gap-1 font-semibold text-sm leading-tight truncate text-left">
                  <SubjectIcon
                    icon={subjectIcon.get(cls.subject_id) ?? ""}
                    className="size-3.5 shrink-0"
                  />
                  <span className="truncate">{subjectName}</span>
                </span>
                {height >= 40 && (
                  <span className="text-xs leading-tight opacity-90 text-left">
                    {hasEvaluation ? EVALUATION_TYPE_LABELS[evaluation.type] ?? evaluation.type : times}
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent side="right" align="start" collisionPadding={16}>
                <div className="flex flex-col gap-2">
                  <div>
                    <PopoverTitle>{subjectName}</PopoverTitle>
                    {hasEvaluation ? (
                      <PopoverDescription>
                        {EVALUATION_TYPE_LABELS[evaluation.type] ?? evaluation.type}
                      </PopoverDescription>
                    ) : isCancelled ? (
                      <div className="flex items-center gap-1 text-destructive mt-1">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span className="text-sm">
                          {dayOff ? "This day was cancelled." : "This class was cancelled."}
                        </span>
                      </div>
                    ) : (
                      <PopoverDescription>
                        {day.full} · {times}
                      </PopoverDescription>
                    )}
                  </div>
                  {(isCancelled || hasEvaluation) && (
                    <>
                      <div className="text-sm text-muted-foreground">
                        {day.full} · {times}
                      </div>
                      {cancellation && (
                        <div className="text-sm text-muted-foreground">
                          Reason: {REASON_LABELS[cancellation.reason] ?? cancellation.reason}
                          {cancellation.note ? ` — ${cancellation.note}` : ""}
                        </div>
                      )}
                      {dayOff && (
                        <div className="text-sm text-muted-foreground">
                          Reason: {REASON_LABELS[dayOff.reason] ?? dayOff.reason}
                          {dayOff.note ? ` — ${dayOff.note}` : ""}
                        </div>
                      )}
                    </>
                  )}
                  <Separator />
                  <div className="flex gap-2">
                    {hasEvaluation ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        disabled={deletingEvalId === evaluation.id}
                        onClick={() => handleDeleteEvaluation(evaluation.id)}
                      >
                        {deletingEvalId === evaluation.id && <Loader2 className="size-3.5 animate-spin" />}
                        Delete evaluation
                      </Button>
                    ) : cancellation ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={uncancelingId === cancellation.id}
                        onClick={() => handleUncancelClass(cls.id, cancellation.id)}
                      >
                        {uncancelingId === cancellation.id && <Loader2 className="size-3.5 animate-spin" />}
                        Uncancel
                      </Button>
                    ) : dayOff ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={uncancelingId === dayOff.id}
                        onClick={() => handleUncancelDay(dayOff.id)}
                      >
                        {uncancelingId === dayOff.id && <Loader2 className="size-3.5 animate-spin" />}
                        Uncancel day
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setCancelDialog({ cls, date: day.dateStr })}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setEditDialog({ cls, subjectName })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => setDeleteDialog({ cls, subjectName })}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )
        })}
      </div>
    )
  }

  function renderDayCells() {
    return weekDays.map((day) => renderDayCell(day))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] md:px-8 md:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8 bg-foreground/5 hover:bg-foreground/10!" onClick={goPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium min-w-32 text-center">
            {isMobile ? `${mobileDay.full}, ${formatDateShort(mobileDayDate, timezone)}` : weekLabel()}
          </span>
          <Button variant="ghost" size="icon" className="size-8 bg-foreground/5 hover:bg-foreground/10!" onClick={goNext}>
            <ChevronRight className="size-4" />
          </Button>
          {showToday && (
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => { setCreateDefaults({}); setCreateOpen(true) }}
          className={cn("gap-1.5", showToday && "max-md:size-9 max-md:p-0")}
          aria-label="New class"
        >
          <Plus className="size-3.5" />
          {showToday && <span className="max-md:hidden">New class</span>}
        </Button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 rounded-lg border border-border bg-background overflow-hidden">
        <div className="flex shrink-0 border-b border-border bg-background">
          <div className="w-14 shrink-0" />
          <div
            ref={headerScrollRef}
            onScroll={syncHeaderScroll}
            className="flex-1 max-md:overflow-hidden"
          >
            <div className="hidden md:flex">
              {weekDays.map((day) => (
                <div
                  key={day.dateStr}
                  className="flex flex-col items-center gap-0.5 flex-1 min-w-0 border-l border-border/50 px-2 py-2"
                >
                  <div className="text-xs text-muted-foreground">{day.name}</div>
                  <div className={cn("flex items-center gap-1 text-lg font-medium", day.today && "text-primary")}>
                    {day.dayNum}
                    {day.today && <span className="size-1.5 rounded-full bg-primary" />}
                  </div>
                  <DayHeaderAction
                    dateStr={day.dateStr}
                    dayOff={dayOffFor(day.dateStr)}
                    busyId={uncancelingId}
                    onUndoDay={handleUncancelDay}
                    onCancelDay={(ds) => setDayCancelTarget(ds)}
                  />
                </div>
              ))}
            </div>
            <div className="flex md:hidden">
              <div className="flex flex-col items-center gap-0.5 flex-1 border-l border-border/50 px-2 py-2">
                <div className="text-xs text-muted-foreground">{mobileDay.name}</div>
                <div className={cn("flex items-center gap-1 text-lg font-medium", mobileDay.today && "text-primary")}>
                  {mobileDay.dayNum} {formatInTz(mobileDayDate, timezone, { month: "short" })}
                </div>
                <DayHeaderAction
                    dateStr={mobileDay.dateStr}
                    dayOff={dayOffFor(mobileDay.dateStr)}
                    busyId={uncancelingId}
                    onUndoDay={handleUncancelDay}
                    onCancelDay={(ds) => setDayCancelTarget(ds)}
                  />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="md:flex max-md:hidden flex-1 min-h-0">
            <div ref={scrollDesktopRef} className="flex-1 overflow-y-auto no-scrollbar">
              <div className="flex relative" style={{ height: `${24 * 4 * SLOT_HEIGHT}px` }}>
                <div className="w-14 shrink-0 relative border-r border-border bg-background">
                  {renderHourLabels()}
                </div>
                {renderDayCells()}
              </div>
            </div>
          </div>

          <div className="flex md:hidden flex-1 min-h-0">
            <div
              ref={gutterScrollRef}
              onScroll={syncGutterScroll}
              className="w-14 shrink-0 overflow-y-auto border-r border-border bg-background no-scrollbar max-md:overscroll-y-contain"
            >
              {renderHourLabels()}
            </div>
            <div
              ref={scrollMobileRef}
              onScroll={syncGridScroll}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            >
              <div className="flex relative" style={{ height: `${24 * 4 * SLOT_HEIGHT}px` }}>
                {renderDayCell(mobileDay)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CancelClassDialog
        open={cancelDialog !== null}
        onOpenChange={(open) => { if (!open) setCancelDialog(null) }}
        cls={cancelDialog?.cls ?? null}
        date={cancelDialog?.date ?? ""}
        onCancelled={fetchData}
      />

      <DeleteClassDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => { if (!open) setDeleteDialog(null) }}
        subjectName={deleteDialog?.subjectName ?? ""}
        classId={deleteDialog?.cls.id ?? ""}
        onDeleted={fetchData}
      />

      <EditClassDialog
        key={editDialog?.cls.id ?? "none"}
        open={editDialog !== null}
        onOpenChange={(open) => { if (!open) setEditDialog(null) }}
        cls={editDialog?.cls ?? null}
        subjects={subjects}
        onUpdated={fetchData}
      />

      <CreateClassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        subjects={subjects}
        defaultWeekday={createDefaults.weekday}
        defaultTime={createDefaults.time}
        onCreated={fetchData}
      />

      <DayCancelDialog
        open={dayCancelTarget !== null}
        onOpenChange={(open) => { if (!open) setDayCancelTarget(null) }}
        date={dayCancelTarget ?? ""}
        onCancelled={fetchData}
      />
    </div>
  )
}