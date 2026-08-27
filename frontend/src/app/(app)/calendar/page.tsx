import { PageHeader } from "@/components/layout/page-header"
import { CalendarWeekView } from "@/components/calendar/calendar-week-view"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Calendar",
}

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" subtitle="Your weekly schedule, containing classes and evaluations." />
      <CalendarWeekView />
    </>
  )
}
