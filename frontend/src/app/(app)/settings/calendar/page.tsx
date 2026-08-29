import { CalendarFeedSettings } from "@/components/settings/calendar-feed-settings"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings — Calendar",
}

export default function SettingsCalendarPage() {
  return <CalendarFeedSettings />
}