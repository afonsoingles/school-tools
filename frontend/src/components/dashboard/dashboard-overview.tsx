"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
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
import { getClassSchedule } from "@/lib/api/calendar"
import { getEvaluations } from "@/lib/api/evaluations"
import { getHomework } from "@/lib/api/homework"
import { getSubjects } from "@/lib/api/settings"
import { HOMEWORK_STATUS_ICON, isOverdueHomework } from "@/components/homework/constants"
import { SubjectIcon } from "@/components/ui/subject-icon"
import {
  classSubjectMap as buildClassSubjectMap,
  subjectIconMap as buildSubjectIconMap,
  subjectNameMap as buildSubjectNameMap,
} from "@/lib/subjects"
import {
  datePart,
  dayNamesFull,
  formatDateDdMmYyyy,
  formatDateWeekday,
  formatInTz,
  getTzParts,
  isUpcoming,
  timeToMinutes,
  tzDateString,
  weekdayFromDateStr,
} from "@/lib/date-time"
import { useTimezone } from "@/components/layout/timezone-provider"
import type { ClassEvent, ClassSchedule, DayCancellation, Evaluation, Homework, Subject } from "@/types"
import { cn } from "@/lib/utils"

function daysUntil(dateStr: string, todayStr: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((parse(dateStr) - parse(todayStr)) / 86400000)
}

function dueTimeLabel(iso: string, tz: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return formatInTz(d, tz, { hour: "2-digit", minute: "2-digit" }, locale)
}

function dueMinutes(iso: string, tz: string): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 0
  const { h, min } = getTzParts(tz, d)
  return h * 60 + min
}

function shortDate(iso: string, locale: string): string {
  const [y, m, d] = datePart(iso).split("-")
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  })
}

function OverdueIndicator() {
  const t = useTranslations("dashboard")
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center rounded outline-hidden shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("overdue")}
        >
          <TriangleAlert className="size-3.5 text-destructive" />
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          <span>{t("overdue")}</span>
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
  const [dayCancellations, setDayCancellations] = useState<DayCancellation[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const scheduleScrollRef = useRef<HTMLDivElement | null>(null)
  const [scheduleOverflow, setScheduleOverflow] = useState(false)

  useEffect(() => {
    Promise.all([getClassSchedule(), getEvaluations(), getHomework(), getSubjects()])
      .then(([schedule, ev, hw, s]) => {
        setClasses(schedule.classes)
        setDayCancellations(schedule.dayCancellations)
        setEvaluations(ev)
        setHomeworks(hw)
        setSubjects(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const t = useTranslations("dashboard")
  const tHw = useTranslations("homework")
  const timezone = useTimezone()
  const locale = useLocale()

  const now = new Date()
  const todayStr = tzDateString(timezone, now)

  const subjectMap = buildSubjectNameMap(subjects)
  const classSubjectMap = buildClassSubjectMap(classes)
  const subjectIcons = buildSubjectIconMap(subjects)

  function activeScheduleOn(c: ClassEvent, dateStr: string): ClassSchedule | undefined {
    const weekday = weekdayFromDateStr(dateStr)
    return c.schedules.find(
      (s) =>
        s.scheduled_weekday === weekday &&
        s.valid_from <= dateStr &&
        (!s.valid_until || dateStr <= s.valid_until)
    )
  }

  const dayOff = dayCancellations.find((d) => datePart(d.date) === todayStr)

  const todaysClasses = classes
    .filter((c) => !!activeScheduleOn(c, todayStr))
    .map((c) => ({ cls: c, schedule: activeScheduleOn(c, todayStr) as ClassSchedule }))
    .sort((a, b) => a.schedule.start_time.localeCompare(b.schedule.start_time))

  const cancelledToday = new Map(
    classes
      .flatMap((c) =>
        c.cancellations
          .filter((can) => datePart(can.date) === todayStr)
          .map((can) => [c.id, can] as const)
      )
  )

  const activeHomeworks = homeworks.filter((hw) => hw.status !== "finished")
  const activeHomeworkCount = activeHomeworks.length

  const hwToday = homeworks
    .filter((hw) => datePart(hw.due_date) === todayStr)
    .sort((a, b) => dueMinutes(a.due_date, timezone) - dueMinutes(b.due_date, timezone))

  const classRows = todaysClasses.map(({ cls, schedule }) => {
    const cancellation = cancelledToday.get(cls.id)
    const evaluation = evaluations.find((e) => {
      const eDate = datePart(e.date)
      return e.class_id === cls.id && eDate === todayStr
    })
    return {
      key: `class-${cls.id}`,
      kind: "class" as const,
      cls,
      schedule,
      cancellation,
      dayOff: !!dayOff,
      evaluation,
      minute: timeToMinutes(schedule.start_time),
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
        const end = timeToMinutes(row.schedule.end_time)
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
  }, [homeworks, classes, evaluations, dayCancellations, subjects])

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
  }, [scheduleOverflow, homeworks, classes, evaluations, dayCancellations, subjects, timezone])

  const upcoming = evaluations
    .filter((e) => isUpcoming(e.date, todayStr))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const upcomingHomework = activeHomeworks
    .slice()
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)

  const upcomingEvalCount = upcoming.length
  const examCount = upcoming.filter((e) => e.type === "exam").length
  const quizCount = upcoming.filter((e) => e.type === "quiz").length
  const worksheetCount = upcoming.filter((e) => e.type === "worksheet").length
  const reportCount = upcoming.filter((e) => e.type === "report").length
  const otherCount = upcoming.filter((e) => e.type === "other").length

  const evalTypeLabels: Record<string, string> = {
    exam: t("evalTypes.exam"),
    quiz: t("evalTypes.quiz"),
    worksheet: t("evalTypes.worksheet"),
    report: t("evalTypes.report"),
    other: t("evalTypes.other"),
  }
  const hwStatusLabels: Record<string, string> = {
    not_started: tHw("statusNotStarted"),
    ongoing: tHw("statusOngoing"),
    finished: tHw("statusFinished"),
  }
  const evalCountParts = [
    examCount > 0 ? t("examCount", { count: examCount }) : "",
    quizCount > 0 ? t("quizCount", { count: quizCount }) : "",
    worksheetCount > 0 ? t("worksheetCount", { count: worksheetCount }) : "",
    reportCount > 0 ? t("reportCount", { count: reportCount }) : "",
    otherCount > 0 ? t("otherCount", { count: otherCount }) : "",
  ].filter(Boolean)
  const evalBreakdown = evalCountParts.length > 0 ? ` (${evalCountParts.join(", ")})` : ""

  const nextEval = upcoming[0]
  const nextEvalDays = nextEval ? daysUntil(datePart(nextEval.date), todayStr) : null
  const nextEvalSubject = nextEval
    ? (() => {
        const subjectId = classSubjectMap.get(nextEval.class_id)
        return (subjectId && subjectMap.get(subjectId)) ?? t("unknownSubject")
      })()
    : null

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
  classes.forEach((c) => {
    c.schedules.forEach((s) => {
      if (!s.valid_until) weekdayCounts[s.scheduled_weekday - 1] += 1
    })
  })
  const busiestIndex = weekdayCounts.indexOf(Math.max(...weekdayCounts))

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-36 rounded-full" />
          ))}
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <SummaryChip icon={<CalendarDays className="size-4" />}>
          {todaysClasses.length === 0
            ? t("noClassesToday")
            : t("classesToday", { count: todaysClasses.length })}
        </SummaryChip>

        <SummaryChip icon={<ClipboardList className="size-4" />}>
          {upcomingEvalCount === 0 ? (
            t("noUpcomingEvaluations")
          ) : (
            <>
              {t("upcomingEvaluations", { count: upcomingEvalCount })}
              <span className="text-muted-foreground">{evalBreakdown}</span>
            </>
          )}
        </SummaryChip>

        <SummaryChip icon={<Timer className="size-4" />}>
          {!nextEval
            ? t("noExamsScheduled")
            : nextEvalDays === 0
              ? t("nextExamToday", {
                  type: evalTypeLabels[nextEval.type] ?? nextEval.type,
                  subject: nextEvalSubject ?? t("unknownSubject"),
                })
              : t("nextExamDays", {
                  type: evalTypeLabels[nextEval.type] ?? nextEval.type,
                  days: nextEvalDays ?? 0,
                  subject: nextEvalSubject ?? t("unknownSubject"),
                })}
        </SummaryChip>

        <SummaryChip icon={<FileText className="size-4" />}>
          {activeHomeworkCount === 0
            ? t("noHomeworkToDo")
            : t("homeworkToDo", { count: activeHomeworkCount })}
        </SummaryChip>

        {classes.length > 0 && (
          <SummaryChip icon={<Flame className="size-4" />}>
            {t("busiestDay", {
              day: dayNamesFull(locale)[busiestIndex],
              count: weekdayCounts[busiestIndex],
            })}
          </SummaryChip>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4 text-muted-foreground" />
                {t("scheduleTitle")}
              </span>
            </CardTitle>
            <CardDescription>
              {formatInTz(now, timezone, {
                weekday: "long",
                day: "numeric",
                month: "long",
              }, locale)}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {scheduleRows.length === 0 ? (
              <p className="py-8 text-sm text-center text-muted-foreground">{t("nothingScheduled")}</p>
            ) : (
              <div
                ref={scheduleScrollRef}
                className={cn("flex flex-col overflow-y-auto pr-1", scheduleOverflow && "max-h-96")}
              >
                {scheduleRows.map((row, index) => {
                  const isLast = index === scheduleRows.length - 1
                  const timeSlot = row.isToday
                    ? row.kind === "class"
                      ? row.schedule.start_time
                      : dueTimeLabel(row.hw.due_date, timezone, locale)
                    : row.kind === "homework"
                      ? ""
                      : ""

                  if (row.kind === "homework") {
                    const hw = row.hw
                    const subjectName = subjectMap.get(hw.subject_id) ?? t("unknownSubject")
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
                              {row.overdue ? t("overdue") : shortDate(hw.due_date, locale)}
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
                              <span>{hwStatusLabels[hw.status] ?? hw.status}</span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  }

                  const { cls, schedule, cancellation, dayOff: isDayOff, evaluation } = row
                  const subjectName = subjectMap.get(cls.subject_id) ?? t("unknownSubject")
                  return (
                    <div key={row.key} data-min={row.minute} className="flex items-stretch gap-3">
                      <span
                        className={cn(
                          "pt-1 text-sm text-right w-14 shrink-0 tabular-nums text-muted-foreground",
                          row.key === currentRowKey && "font-bold"
                        )}
                      >
                        {schedule.start_time}
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
                          <span className={cn("flex items-center gap-1.5 text-sm font-medium", (cancellation || isDayOff) && "text-muted-foreground line-through", row.key === currentRowKey && "font-bold")}>
                            <span className="truncate">{subjectName}</span>
                            {evaluation && (
                              <Badge variant="destructive" className="text-[11px] shrink-0">
                                {evalTypeLabels[evaluation.type] ?? evaluation.type}
                              </Badge>
                            )}
                            {(cancellation || isDayOff) && (
                              <Badge variant="outline" className="text-[11px] text-muted-foreground shrink-0">
                                {t("cancelled")}
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {schedule.start_time} – {schedule.end_time}
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
            <CardTitle>
              <span className="flex items-center gap-1.5">
                <ClipboardList className="size-4 text-muted-foreground" />
                {t("evaluationsTitle")}
              </span>
            </CardTitle>
            <CardDescription>{t("evaluationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-8 text-sm text-center text-muted-foreground">{t("noUpcomingEvaluationsCard")}</p>
            ) : (
              <div className="flex flex-col">
                {upcoming.map((evaluation) => {
                  const subjectId = classSubjectMap.get(evaluation.class_id)
                  const subjectName = (subjectId && subjectMap.get(subjectId)) ?? t("unknownSubject")

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
                        {formatDateWeekday(datePart(evaluation.date), locale)}
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
                        {evalTypeLabels[evaluation.type] ?? evaluation.type}
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
            <CardTitle>
              <span className="flex items-center gap-1.5">
                <FileText className="size-4 text-muted-foreground" />
                {t("homeworkTitle")}
              </span>
            </CardTitle>
            <CardDescription>{t("homeworkDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingHomework.length === 0 ? (
              <p className="py-8 text-sm text-center text-muted-foreground">{t("noHomeworkCard")}</p>
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
                        <span>{hwStatusLabels[hw.status] ?? hw.status}</span>
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