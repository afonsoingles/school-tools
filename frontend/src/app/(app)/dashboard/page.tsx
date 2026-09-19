import { PageHeader } from "@/components/layout/page-header"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { getCurrentUser } from "@/lib/api/auth"
import type { Metadata } from "next"
import { getTranslations, getLocale } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard")
  return { title: t("pageTitle") }
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard")
  const locale = await getLocale()
  let userName = ""
  try {
    const user = await getCurrentUser()
    userName = user.name
  } catch {
    // auth handled by the (app) layout
  }

  const todayLabel = new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <>
      <PageHeader
        className="max-md:hidden"
        title={userName ? t("greetingName", { name: userName }) : t("greeting")}
        subtitle={todayLabel}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col pt-4 px-4 pb-4 md:pt-0 md:px-8 md:pb-6">
          <DashboardOverview />
        </div>
      </div>
    </>
  )
}