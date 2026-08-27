"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ClipboardList, Flame, Timer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import { getSubjects } from "@/lib/api/settings"
import { EVALUATION_TYPE_LABELS } from "@/components/evaluations/constants"
import type { ClassEvent, CanceledClassEvent, Evaluation, Subject } from "@/types"
import { cn } from "@/lib/utils"

const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function datePart(iso: string): string {
  return iso.includes("T") ? iso.split("T")[0] : iso
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatEvalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

function daysUntil(dateStr: string, today: Date): number {
  const [y, m, d] = dateStr.split("-")
  const target = new Date(Number(y), Number(m) - 1, Number(d))
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - todayMidnight.getTime()) / 86400000)
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
  const [cancellations, setCancellations] = useState<CanceledClassEvent[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getClasses(), getCancellations(), getEvaluations(), getSubjects()])
      .then(([c, canc, ev, s]) => {
        setClasses(c)
        setCancellations(canc)
        setEvaluations(ev)
        setSubjects(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const todayStr = toDateString(now)
  const jsDay = now.getDay()
  const backendWeekday = ((jsDay + 6) % 7) + 1

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]))
  const classSubjectMap = new Map(classes.map((c) => [c.id, c.subject_id]))

  const todaysClasses = classes
    .filter((c) => c.weekday === backendWeekday)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const cancelledToday = new Map(
    cancellations
      .filter((c) => c.date === todayStr)
      .map((c) => [c.class_id, c] as const)
  )

  const upcoming = evaluations
    .filter((e) => datePart(e.date) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const upcomingEvalCount = upcoming.length
  const examCount = upcoming.filter((e) => e.type === "exam").length
  const quizCount = upcoming.filter((e) => e.type === "quiz").length
  const otherCount = upcoming.filter((e) => e.type === "other").length

  const nextEval = upcoming[0]
  const nextEvalDays = nextEval ? daysUntil(datePart(nextEval.date), now) : null
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
            <Skeleton key={i} className="h-9 w-44 rounded-full" />
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
      <div className="flex flex-wrap items-center gap-2">
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

        {classes.length > 0 && (
          <SummaryChip icon={<Flame className="size-4" />}>
            Busiest day: {DAY_FULL[busiestIndex]} ({weekdayCounts[busiestIndex]} class
            {weekdayCounts[busiestIndex] > 1 ? "es" : ""})
          </SummaryChip>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
            <CardDescription>
              {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysClasses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing scheduled today.</p>
            ) : (
              <div className="flex flex-col">
                {todaysClasses.map((cls, index) => {
                  const cancellation = cancelledToday.get(cls.id)
                  const evaluation = evaluations.find((e) => {
                    const eDate = datePart(e.date)
                    return e.class_id === cls.id && eDate === todayStr
                  })
                  const subjectName = subjectMap.get(cls.subject_id) ?? "Unknown"
                  const isLast = index === todaysClasses.length - 1

                  return (
                    <div key={cls.id} className="flex gap-3">
                      <span className="w-14 shrink-0 pt-1 text-right text-sm tabular-nums text-muted-foreground">
                        {cls.start_time}
                      </span>

                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "mt-1.5 size-2 rounded-full",
                            cancellation
                              ? "bg-muted-foreground/50"
                              : evaluation
                                ? "bg-destructive"
                                : "bg-primary"
                          )}
                        />
                        {!isLast && <span className="w-px flex-1 bg-border" />}
                      </div>

                      <div className="flex flex-1 items-center justify-between gap-2 pb-5">
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-medium", cancellation && "text-muted-foreground line-through")}>
                            {subjectName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {cls.start_time} – {cls.end_time}
                          </span>
                        </div>
                        {cancellation ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            Cancelled
                          </Badge>
                        ) : evaluation ? (
                          <Badge variant="destructive">
                            {EVALUATION_TYPE_LABELS[evaluation.type] ?? evaluation.type}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming evaluations</CardTitle>
            <CardDescription>Next exams, quizzes and assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No upcoming evaluations.</p>
            ) : (
              <div className="flex flex-col">
                {upcoming.map((evaluation) => {
                  const subjectId = classSubjectMap.get(evaluation.class_id)
                  const subjectName = (subjectId && subjectMap.get(subjectId)) ?? "Unknown"

                  return (
                    <div
                      key={evaluation.id}
                      className="flex items-center gap-3 border-t border-border py-3 first:border-t-0"
                    >
                      <span className="flex-1 truncate text-sm font-medium">{subjectName}</span>
                      <span className="hidden w-28 text-right text-sm text-muted-foreground sm:block">
                        {formatEvalDate(datePart(evaluation.date))}
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
      </div>
    </div>
  )
}