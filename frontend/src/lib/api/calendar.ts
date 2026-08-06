import { mockResolve } from "@/lib/api/client"
import type { CalendarEvent } from "@/types"

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return mockResolve([])
}