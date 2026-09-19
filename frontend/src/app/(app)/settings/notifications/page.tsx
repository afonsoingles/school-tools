import { NotificationSettingsSection } from "@/components/settings/notification-settings-section"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings")
  return { title: `${t("layout.title")} — ${t("nav.notifications")}` }
}

export default function SettingsNotificationsPage() {
  return <NotificationSettingsSection />
}