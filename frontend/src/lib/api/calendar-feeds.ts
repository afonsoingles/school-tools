import { apiFetch } from "@/lib/api/client"
import type { CalendarFeeds } from "@/types"

interface FeedsResponse {
  success: boolean
  feeds: CalendarFeeds
}

export async function getCalendarFeeds(): Promise<CalendarFeeds> {
  const res = await apiFetch<FeedsResponse>("/v1/calendar/feeds")
  return res.feeds
}

export async function regenerateCalendarFeeds(): Promise<CalendarFeeds> {
  const res = await apiFetch<FeedsResponse>("/v1/calendar/feeds", {
    method: "POST",
  })
  return res.feeds
}