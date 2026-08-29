import { PageHeader } from "@/components/layout/page-header"
import { CalendarWeekView } from "@/components/calendar/calendar-week-view"
import { CalendarSyncHint } from "@/components/calendar/calendar-sync-hint"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Calendar",
}

export default function CalendarPage() {
  return (
    <>
      <div className="relative">
        <PageHeader title="Calendar" subtitle="Your weekly schedule, containing classes and evaluations." />
        <CalendarSyncHint className="absolute right-8 top-1/2 -translate-y-1/2" />
      </div>
      <CalendarWeekView />
    </>
  )
}
