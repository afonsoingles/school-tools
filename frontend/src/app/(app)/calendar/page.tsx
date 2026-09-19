import { PageHeader } from "@/components/layout/page-header"
import { CalendarWeekView } from "@/components/calendar/calendar-week-view"
import { CalendarSyncHint } from "@/components/calendar/calendar-sync-hint"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar")
  return { title: t("page.title") }
}

export default async function CalendarPage() {
  const t = await getTranslations("calendar")

  return (
    <>
      <div className="relative">
        <PageHeader title={t("page.title")} subtitle={t("page.subtitle")} />
        <CalendarSyncHint className="absolute top-1/2 right-8 -translate-y-1/2 max-md:static max-md:top-auto max-md:right-auto max-md:mr-4 max-md:flex max-md:translate-y-0 max-md:justify-end" />
      </div>
      <CalendarWeekView />
    </>
  )
}