import { PageHeader } from "@/components/layout/page-header"
import { CalendarWeekView } from "@/components/calendar/calendar-week-view"

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" subtitle="Your weekly schedule, containing classes and evaluations." />
      <CalendarWeekView />
    </>
  )
}
