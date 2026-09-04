import type { HomeworkStatus } from "@/types"

export const HOMEWORK_STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  ongoing: "Ongoing",
  finished: "Finished",
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