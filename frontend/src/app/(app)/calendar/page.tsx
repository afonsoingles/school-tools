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
        <CalendarSyncHint className="absolute top-1/2 right-8 -translate-y-1/2 max-md:static max-md:top-auto max-md:right-auto max-md:mr-4 max-md:flex max-md:translate-y-0 max-md:justify-end" />
      </div>
      <CalendarWeekView />
    </>
  )
}