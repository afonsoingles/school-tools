import { AutoCancelHolidaysSettings } from "@/components/settings/auto-cancel-holidays"
import { CalendarFeedSettings } from "@/components/settings/calendar-feed-settings"
import { Separator } from "@/components/ui/separator"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings")
  return { title: `${t("layout.title")} — ${t("nav.calendar")}` }
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