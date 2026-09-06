"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Flame,
  Timer,
  TriangleAlert,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getClasses, getCancellations } from "@/lib/api/calendar"
import { getEvaluations } from "@/lib/api/evaluations"
import { getHomework } from "@/lib/api/homework"
import { getSubjects } from "@/lib/api/settings"
import { EVALUATION_TYPE_LABELS } from "@/components/evaluations/constants"
import { HOMEWORK_STATUS_ICON, HOMEWORK_STATUS_LABELS, isOverdueHomework } from "@/components/homework/constants"
import { SubjectIcon } from "@/components/ui/subject-icon"
import { subjectIconMap as buildSubjectIconMap, subjectNameMap as buildSubjectNameMap } from "@/lib/subjects"
import {
  DAY_FULL,
  datePart,
  formatDateDdMmYyyy,
  formatDateWeekday,
  getTzParts,
  timeToMinutes,
} from "@/lib/date-time"
import { useTimezone } from "@/components/layout/timezone-provider"
import type { ClassEvent, CancelledClassEvent, Evaluation, Homework, Subject } from "@/types"
import { cn } from "@/lib/utils"

function toDateString(tz: string, date: Date): string {
  const { y, m, d } = getTzParts(tz, date)
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

function daysUntil(dateStr: string, todayStr: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((parse(dateStr) - parse(todayStr)) / 86400000)
}

function dueTimeLabel(iso: string, tz: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" })
}

function dueMinutes(iso: string, tz: string): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 0
  const { h, min } = getTzParts(tz, d)
  return h * 60 + min
}

function shortDate(iso: string): string {
  const [y, m, d] = datePart(iso).split("-")
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

function OverdueIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center rounded outline-none shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Overdue"
        >
          <TriangleAlert className="size-3.5 text-destructive" />
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          <span>Overdue</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function SummaryChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </span>
  )
}

export function DashboardOverview() {
  const [classes, setClasses] = useState<ClassEvent[]>([])
  const [cancellations, setCancellations] = useState<CancelledClassEvent[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const scheduleScrollRef = useRef<HTMLDivElement | null>(null)
  const [scheduleOverflow, setScheduleOverflow] = useState(false)

  useEffect(() => {
    Promise.all([getClasses(), getCancellations(), getEvaluations(), getHomework(), getSubjects()])
      .then(([c, canc, ev, hw, s]) => {
        setClasses(c)
        setCancellations(canc)
        setEvaluations(ev)
        setHomeworks(hw)
        setSubjects(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const timezone = useTimezone()

  const now = new Date()
  const todayStr = toDateString(timezone, now)
  const backendWeekday = getTzParts(timezone, now).weekday

  const subjectMap = buildSubjectNameMap(subjects)
  const classSubjectMap = new Map(classes.map((c) => [c.id, c.subject_id]))
  const subjectIcons = buildSubjectIconMap(subjects)

  const todaysClasses = classes
    .filter((c) => c.weekday === backendWeekday)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const cancelledToday = new Map(
    cancellations
      .filter((c) => datePart(c.date) === todayStr)
      .map((c) => [c.class_id, c] as const)
  )

  const activeHomeworks = homeworks.filter((hw) => hw.status !== "finished")
  const activeHomeworkCount = activeHomeworks.length

  const hwToday = homeworks
    .filter((hw) => datePart(hw.due_date) === todayStr)
    .sort((a, b) => dueMinutes(a.due_date, timezone) - dueMinutes(b.due_date, timezone))

  const classRows = todaysClasses.map((cls) => {
    const cancellation = cancelledToday.get(cls.id)
    const evaluation = evaluations.find((e) => {
      const eDate = datePart(e.date)
      return e.class_id === cls.id && eDate === todayStr
    })
    return {
      key: `class-${cls.id}`,
      kind: "class" as const,
      cls,
      cancellation,
      evaluation,
      minute: timeToMinutes(cls.start_time),
      isToday: true,
      overdue: false,
    }
  })

  const todaysHwRows = hwToday.map((hw) => ({
    key: `hw-${hw.id}`,
    kind: "homework" as const,
    hw,
    minute: dueMinutes(hw.due_date, timezone),
    isToday: true,
    overdue: isOverdueHomework(hw, now),
  }))

  const timedRows = [...classRows, ...todaysHwRows].sort((a, b) => a.minute - b.minute)

  const scheduleRows = timedRows

  const nowParts = getTzParts(timezone, now)
  const currentMinute = nowParts.h * 60 + nowParts.min
  const currentRowKey = (() => {
    const timed = scheduleRows.filter((row) => row.isToday)
    for (const row of timed) {
      if (row.kind === "class") {
        const start = row.minute
        const end = timeToMinutes(row.cls.end_time)
        if (currentMinute >= start && currentMinute < end) return row.key
      }
    }
    const next = timed.find((row) => row.minute > currentMinute)
    return next ? next.key : null
  })()

  useEffect(() => {
    const el = scheduleScrollRef.current
    if (!el) return
    const update = () => {
      setScheduleOverflow(el.scrollHeight > el.clientHeight + 2)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [homeworks, classes, evaluations, cancellations, subjects])

  useEffect(() => {
    const el = scheduleScrollRef.current
    if (!el || !scheduleOverflow) return
    const nowAnim = new Date()
    const nowTz = getTzParts(timezone, nowAnim)
    const nowMin = nowTz.h * 60 + nowTz.min
    const rowEls = Array.from(el.querySelectorAll<HTMLElement>("[data-min]"))
    let target: HTMLElement | undefined
    for (const r of rowEls) {
      const m = Number(r.dataset.min ?? "")
      if (!Number.isNaN(m)) target = m <= nowMin ? r : (target ?? r)
    }
    if (!target) return
    const top = target.offsetTop - el.clientHeight / 2
    el.scrollTop = Math.max(0, top)
  }, [scheduleOverflow, homeworks, classes, evaluations, cancellations, subjects, timezone])

  const upcoming = evaluations
    .filter((e) => datePart(e.date) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const upcomingHomework = activeHomeworks
    .slice()
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)

  const upcomingEvalCount = upcoming.length
  const examCount = upcoming.filter((e) => e.type === "exam").length
  const quizCount = upcoming.filter((e) => e.type === "quiz").length
  const otherCount = upcoming.filter((e) => e.type === "other").length

  const nextEval = upcoming[0]
  const nextEvalDays = nextEval ? daysUntil(datePart(nextEval.date), todayStr) : null
  const nextEvalSubject = nextEval
    ? (() => {
        const subjectId = classSubjectMap.get(nextEval.class_id)
        return (subjectId && subjectMap.get(subjectId)) ?? "Unknown"
      })()
    : null

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
  classes.forEach((c) => {
    weekdayCounts[c.weekday - 1] += 1
  })
  const busiestIndex = weekdayCounts.indexOf(Math.max(...weekdayCounts))

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="rounded-full h-9 w-44" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="hidden md:flex flex-wrap items-center gap-2">
        <SummaryChip icon={<CalendarDays className="size-4" />}>
          {todaysClasses.length === 0
            ? "No classes today"
            : `${todaysClasses.length} class${todaysClasses.length > 1 ? "es" : ""} today`}
        </SummaryChip>

        <SummaryChip icon={<ClipboardList className="size-4" />}>
          {upcomingEvalCount === 0 ? (
            "No upcoming evaluations"
          ) : (
            <>
              {upcomingEvalCount} upcoming evaluation{upcomingEvalCount > 1 ? "s " : " "}
              <span className="text-muted-foreground">
                ({[examCount > 0 && `${examCount} exam${examCount > 1 ? "s" : ""}`, quizCount > 0 && `${quizCount} quiz${quizCount > 1 ? "zes" : ""}`, otherCount > 0 && `${otherCount} other`].filter(Boolean).join(", ")})
              </span>
            </>
          )}
        </SummaryChip>

        <SummaryChip icon={<Timer className="size-4" />}>
          {!nextEval
            ? "No exams scheduled"
            : nextEvalDays === 0
              ? `Next ${EVALUATION_TYPE_LABELS[nextEval.type].toLowerCase()} today — ${nextEvalSubject}`
              : `Next ${EVALUATION_TYPE_LABELS[nextEval.type].toLowerCase()} in ${nextEvalDays} day${nextEvalDays === 1 ? "" : "s"} — ${nextEvalSubject}`}
        </SummaryChip>

        <SummaryChip icon={<FileText className="size-4" />}>
          {activeHomeworkCount === 0
            ? "No homework to do"
            : `${activeHomeworkCount} homework ${activeHomeworkCount > 1 ? "items" : "item"} to do`}
        </SummaryChip>

        {classes.length > 0 && (
          <SummaryChip icon={<Flame className="size-4" />}>
            Busiest day: {DAY_FULL[busiestIndex]} ({weekdayCounts[busiestIndex]} class
            {weekdayCounts[busiestIndex] > 1 ? "es" : ""})
          </SummaryChip>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
            <CardDescription>
              {now.toLocaleDateString("en-GB", {
                timeZone: timezone,
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {scheduleRows.length === 0 ? (
              <p className="py-8 text-sm text-center text-muted-foreground">Nothing scheduled today.</p>
            ) : (
              <div
                ref={scheduleScrollRef}
                className={cn("flex flex-col overflow-y-auto pr-1", scheduleOverflow && "max-h-96")}
              >
                {scheduleRows.map((row, index) => {
                  const isLast = index === scheduleRows.length - 1
                  const timeSlot = row.isToday
                    ? row.kind === "class"
                      ? row.cls.start_time
                      : dueTimeLabel(row.hw.due_date, timezone)
                    : row.kind === "homework"
                      ? ""
                      : ""

                  if (row.kind === "homework") {
                    const hw = row.hw
                    const subjectName = subjectMap.get(hw.subject_id) ?? "Unknown"
                    const StatusIcon = HOMEWORK_STATUS_ICON[hw.status]
                    return (
                      <Link
                        key={row.key}
                        href={`/homework/${hw.id}`}
                        data-min={row.isToday ? row.minute : undefined}
                        className="flex items-stretch gap-3 rounded-md group hover:bg-muted/40"
                      >
                        <span
                          className={cn(
                            "pt-1 w-14 shrink-0 text-sm text-right tabular-nums",
                            row.overdue ? "font-medium text-destructive" : "text-muted-foreground",
                            row.key === currentRowKey && "font-bold"
                          )}
                        >
                          {row.isToday ? (
                            <>{timeSlot}</>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                                row.overdue
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {row.overdue ? "Overdue" : shortDate(hw.due_date)}
                            </span>
                          )}
                        </span>

                        <div className="flex flex-col items-center pt-1.5">
                          <FileText
                            className={cn(
                              "size-4 shrink-0",
                              row.overdue ? "text-destructive" : "text-muted-foreground"
                            )}
                          />
                          {!isLast && <span className="flex-1 w-px bg-border" />}
                        </div>

                        <div className="flex items-center gap-2 flex-1 pb-5 pt-0.5 min-w-0">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className={cn("flex items-center gap-1.5 text-sm font-medium", row.overdue && "text-destructive", row.key === currentRowKey && "font-bold")}>
                              <span className="truncate">{hw.title}</span>
                              {row.overdue && <OverdueIndicator />}
                            </span>
                            <span
                              className={cn(
                                "flex items-center gap-1 text-xs",
                                row.overdue ? "text-destructive/80" : "text-muted-foreground"
                              )}
                            >
                              <SubjectIcon
                                icon={subjectIcons.get(hw.subject_id) ?? ""}
                                className="size-3 shrink-0"
                              />
                              <span className="truncate">{subjectName}</span>
                              <span className="text-muted-foreground/60">·</span>
                              <StatusIcon className="size-3 shrink-0" />
                              <span>{HOMEWORK_STATUS_LABELS[hw.status]}</span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  }

                  const { cls, cancellation, evaluation } = row
                  const subjectName = subjectMap.get(cls.subject_id) ?? "Unknown"
                  return (
                    <div key={row.key} data-min={row.minute} className="flex items-stretch gap-3">
                      <span
                        className={cn(
                          "pt-1 text-sm text-right w-14 shrink-0 tabular-nums text-muted-foreground",
                          row.key === currentRowKey && "font-bold"
                        )}
                      >
                        {cls.start_time}
                      </span>

                      <div className="flex flex-col items-center pt-1.5">
                        {evaluation ? (
                          <FileText className="size-4 shrink-0 text-destructive" />
                        ) : (
                          <SubjectIcon
                            icon={subjectIcons.get(cls.subject_id) ?? ""}
                            className="size-4 shrink-0"
                          />
                        )}
                        {!isLast && <span className="flex-1 w-px bg-border" />}
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-1 pb-5 pt-0.5">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className={cn("flex items-center gap-1.5 text-sm font-medium", cancellation && "text-muted-foreground line-through", row.key === currentRowKey && "font-bold")}>
                            <span className="truncate">{subjectName}</span>
                            {evaluation && (
                              <Badge variant="destructive" className="text-[11px] shrink-0">
                                {EVALUATION_TYPE_LABELS[evaluation.type] ?? evaluation.type}
                              </Badge>
                            )}
                            {cancellation && (
                              <Badge variant="outline" className="text-[11px] text-muted-foreground shrink-0">
                                Cancelled
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {cls.start_time} – {cls.end_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming evaluations</CardTitle>
            <CardDescription>Next exams, quizzes and assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-8 text-sm text-center text-muted-foreground">No upcoming evaluations.</p>
            ) : (
              <div className="flex flex-col">
                {upcoming.map((evaluation) => {
                  const subjectId = classSubjectMap.get(evaluation.class_id)
                  const subjectName = (subjectId && subjectMap.get(subjectId)) ?? "Unknown"

                  return (
                    <div
                      key={evaluation.id}
                      className="flex items-center gap-3 py-3 border-t border-border first:border-t-0"
                    >
                      <span className="flex flex-1 items-center gap-1.5 truncate text-sm font-medium">
                          <SubjectIcon
                            icon={(subjectId && subjectIcons.get(subjectId)) ?? ""}
                            className="size-3.5 shrink-0"
                          />
                          <span className="truncate">{subjectName}</span>
                        </span>
                      <span className="hidden text-sm text-right w-28 text-muted-foreground sm:block">
                        {formatDateWeekday(datePart(evaluation.date))}
                      </span>
                      <Badge
                        variant={
                          evaluation.type === "exam"
                            ? "destructive"
                            : evaluation.type === "quiz"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {EVALUATION_TYPE_LABELS[evaluation.type] ?? evaluation.type}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Homework</CardTitle>
            <CardDescription>You don&apos;t want to miss those assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingHomework.length === 0 ? (
              <p className="py-8 text-sm text-center text-muted-foreground">There is no homework!</p>
            ) : (
              <div className="flex flex-col">
                {upcomingHomework.map((hw) => {
                  const overdue = isOverdueHomework(hw, now)
                  const StatusIcon = HOMEWORK_STATUS_ICON[hw.status]
                  return (
                    <Link
                      key={hw.id}
                      href={`/homework/${hw.id}`}
                      className="flex items-center gap-3 px-2 py-3 -mx-2 border-t border-border first:border-t-0 hover:bg-muted/40"
                    >
                      <span className={cn("flex flex-1 items-center gap-1.5 truncate text-sm font-medium min-w-0", overdue && "text-destructive")}>
                        <SubjectIcon
                          icon={subjectIcons.get(hw.subject_id) ?? ""}
                          className="size-3.5 shrink-0"
                        />
                        <span className="truncate">{hw.title}</span>
                        {overdue && <OverdueIndicator />}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <StatusIcon className="size-3" />
                        <span>{HOMEWORK_STATUS_LABELS[hw.status]}</span>
                      </span>
                      <span className="shrink-0 text-right text-sm tabular-nums text-muted-foreground sm:w-28">
                        {formatDateDdMmYyyy(datePart(hw.due_date))}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}