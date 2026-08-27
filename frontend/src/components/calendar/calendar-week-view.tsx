"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { getClasses, getCancellations, uncancelClass } from "@/lib/api/calendar"
import { getSubjects } from "@/lib/api/settings"
import type { ClassEvent, CanceledClassEvent, Subject } from "@/types"
import { CancelClassDialog } from "./cancel-class-dialog"
import { DeleteClassDialog } from "./delete-class-dialog"
import { CreateClassDialog } from "./create-class-dialog"

const SLOT_HEIGHT = 20
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const REASON_LABELS: Record<string, string> = {
  break: "Break",
  public_holiday: "Public holiday",
  other: "Other",
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`
}

function getWeekStart(offset: number): Date {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

export function CalendarWeekView() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [classes, setClasses] = useState<ClassEvent[]>([])
  const [cancellations, setCancellations] = useState<CanceledClassEvent[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  const [cancelDialog, setCancelDialog] = useState<{ cls: ClassEvent; date: string } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ cls: ClassEvent; subjectName: string } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createDefaults, setCreateDefaults] = useState<{ weekday?: number; time?: string }>({})
  const [uncancelingId, setUncancelingId] = useState<string | null>(null)

  const weekStart = getWeekStart(weekOffset)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    return {
      weekday: i + 1,
      date,
      dateStr: toDateString(date),
      name: DAY_NAMES[i],
      full: DAY_FULL[i],
      dayNum: date.getDate(),
      today: isToday(date),
    }
  })

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]))

  const fetchData = useCallback(() => {
    Promise.all([getClasses(), getCancellations(), getSubjects()])
      .then(([c, canc, s]) => {
        setClasses(c)
        setCancellations(canc)
        setSubjects(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (scrollRef.current) {
      if (classes.length > 0) {
        const earliest = classes.reduce((min, c) => {
          const t = timeToMinutes(c.start_time)
          return t < min ? t : min
        }, Infinity)
        const scrollTo = Math.max(0, ((earliest - 30) / 15) * SLOT_HEIGHT)
        scrollRef.current.scrollTop = scrollTo
      } else {
        scrollRef.current.scrollTop = 7 * 4 * SLOT_HEIGHT
      }
    }
  }, [weekOffset, loading, classes])

  function classesForDay(weekday: number): ClassEvent[] {
    return classes.filter((c) => c.weekday === weekday)
  }

  function canceledForDay(classId: string, dateStr: string): CanceledClassEvent | undefined {
    return cancellations.find((c) => c.class_id === classId && c.date === dateStr)
  }

  async function handleUncancel(cancellationId: string) {
    setUncancelingId(cancellationId)
    try {
      await uncancelClass(cancellationId)
      fetchData()
    } finally {
      setUncancelingId(null)
    }
  }

  function weekLabel(): string {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 6)
    if (weekStart.getMonth() === end.getMonth()) {
      return `${formatDateShort(weekStart)} – ${end.getDate()} ${end.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
    }
    return `${formatDateShort(weekStart)} – ${formatDateShort(end)} ${end.getFullYear()}`
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>, weekday: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0)
    const slotIndex = Math.round(y / SLOT_HEIGHT)
    const totalMinutes = slotIndex * 15
    const hour = Math.floor(totalMinutes / 60)
    const min = totalMinutes % 60
    const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`
    setCreateDefaults({ weekday, time })
    setCreateOpen(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-8 pb-6">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-0">
          <Button variant="ghost" size="icon" className="size-8 bg-foreground/5 hover:bg-foreground/10!" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium min-w-50 text-center">{weekLabel()}</span>
          <Button variant="ghost" size="icon" className="size-8 bg-foreground/5 hover:bg-foreground/10!" onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronRight className="size-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
              Today
            </Button>
          )}
        </div>
        <Button size="sm" onClick={() => { setCreateDefaults({}); setCreateOpen(true) }} className="gap-1.5">
          <Plus className="size-3.5" />
          New class
        </Button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 rounded-lg border border-border bg-background overflow-hidden">
        <div className="flex border-b border-border">
          <div className="w-14 shrink-0" />
          {weekDays.map((day) => (
            <div key={day.dateStr} className={cn("flex-1 px-2 py-2 text-center border-l border-border/50")}>
              <div className="text-xs text-muted-foreground">{day.name}</div>
              <div className={cn("text-lg font-medium", day.today && "text-primary")}>
                {day.dayNum}
              </div>
            </div>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex relative" style={{ height: `${24 * 4 * SLOT_HEIGHT}px` }}>
            <div className="w-14 shrink-0 relative border-r border-border">
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

            {weekDays.map((day) => (
              <div
                key={day.dateStr}
                className="relative flex-1 border-l border-border/50"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("[data-slot]")) return
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

                {classesForDay(day.weekday).map((cls) => {
                  const cancel = canceledForDay(cls.id, day.dateStr)
                  const top = (timeToMinutes(cls.start_time) / 15) * SLOT_HEIGHT
                  const height = Math.max(((timeToMinutes(cls.end_time) - timeToMinutes(cls.start_time)) / 15) * SLOT_HEIGHT, 20)
                  const subjectName = subjectMap.get(cls.subject_id) ?? "Unknown"
                  const isCancelled = !!cancel

                  return (
                    <Popover key={cls.id}>
                      <PopoverTrigger
                        className={cn(
                          "absolute left-0.5 right-0.5 flex flex-col justify-start rounded px-2.5 pt-1.5 cursor-pointer transition-colors z-10 overflow-hidden",
                          isCancelled
                            ? "bg-muted text-muted-foreground hover:bg-muted/80"
                            : "bg-blue-600 text-white hover:bg-blue-500",
                        )}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <span className="font-semibold text-sm leading-tight truncate text-left">{subjectName}</span>
                        {height >= 40 && (
                          <span className="text-xs leading-tight opacity-90 text-left">{cls.start_time} – {cls.end_time}</span>
                        )}
                      </PopoverTrigger>
                      <PopoverContent side="right" align="start">
                        <div className="flex flex-col gap-2">
                          <div>
                            <PopoverTitle>{subjectName}</PopoverTitle>
                            {isCancelled ? (
                              <div className="flex items-center gap-1 text-destructive mt-1">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                <span className="text-sm">This class was cancelled.</span>
                              </div>
                            ) : (
                              <PopoverDescription>
                                {day.full} · {cls.start_time} – {cls.end_time}
                              </PopoverDescription>
                            )}
                          </div>
                          {isCancelled && (
                            <>
                              <div className="text-sm text-muted-foreground">
                                Reason: {REASON_LABELS[cancel.reason] ?? cancel.reason}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {day.full} · {cls.start_time} – {cls.end_time}
                              </div>
                            </>
                          )}
                          <Separator />
                          <div className="flex gap-2">
                            {isCancelled ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  disabled={uncancelingId === cancel.id}
                                  onClick={() => handleUncancel(cancel.id)}
                                >
                                  {uncancelingId === cancel.id && <Loader2 className="size-3.5 animate-spin" />}
                                  Uncancel
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
            ))}
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

      <CreateClassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        subjects={subjects}
        defaultWeekday={createDefaults.weekday}
        defaultTime={createDefaults.time}
        onCreated={fetchData}
      />
    </div>
  )
}
