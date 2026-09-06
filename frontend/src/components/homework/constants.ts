import type { Homework, HomeworkStatus } from "@/types"
import { CalendarClock, CheckCircle2, CircleDashed } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const HOMEWORK_STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  ongoing: "Ongoing",
  finished: "Finished",
}

export const HOMEWORK_STATUS_ICON: Record<string, LucideIcon> = {
  not_started: CalendarClock,
  ongoing: CircleDashed,
  finished: CheckCircle2,
}

export const HOMEWORK_STATUS_ORDER: HomeworkStatus[] = [
  "not_started",
  "ongoing",
  "finished",
]

export const HOMEWORK_STATUS_BADGE: Record<HomeworkStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  ongoing: "bg-amber-500/15 text-amber-400",
  finished: "bg-emerald-500/15 text-emerald-400",
}

export function isOverdueHomework(hw: Homework, now: Date): boolean {
  if (hw.status === "finished") return false
  return new Date(hw.due_date).getTime() < now.getTime()
}