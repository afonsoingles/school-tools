import { ApiError, apiFetch } from "@/lib/api/client"
import type { CalendarFeeds } from "@/types"

interface FeedsResponse {
  success: boolean
  feeds: CalendarFeeds
}

interface FeedStatusResponse {
  success: boolean
  is_enabled: boolean
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

export async function setCalendarFeedStatus(isEnabled: boolean): Promise<boolean> {
  const res = await apiFetch<FeedStatusResponse>("/v1/calendar/feeds/status", {
    method: "POST",
    body: JSON.stringify({ is_enabled: isEnabled }),
  })
  return res.is_enabled
}

export function isFeedDisabled(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 403 &&
    (err.body as { code?: string } | null)?.code === "feed_disabled"
  )
}