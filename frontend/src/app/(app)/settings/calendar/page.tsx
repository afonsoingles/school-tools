import { AutoCancelHolidaysSettings } from "@/components/settings/auto-cancel-holidays"
import { CalendarFeedSettings } from "@/components/settings/calendar-feed-settings"
import { Separator } from "@/components/ui/separator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings — Calendar",
}

export default function SettingsCalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      <CalendarFeedSettings />
      <Separator />
      <AutoCancelHolidaysSettings />
    </div>
  )
}