import { PageHeader } from "@/components/layout/page-header"
import { NotificationsList } from "@/components/notifications/notifications-list"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications")
  return { title: t("page.title") }
}

export default async function NotificationsPage() {
  const t = await getTranslations("notifications")

  return (
    <>
      <PageHeader title={t("page.title")} subtitle={t("page.subtitle")} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col px-4 pb-4 md:px-8 md:pb-6">
          <NotificationsList />
        </div>
      </div>
    </>
  )
}