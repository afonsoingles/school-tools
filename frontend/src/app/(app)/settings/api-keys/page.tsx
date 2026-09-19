import { ApiKeysSection } from "@/components/settings/api-keys-section"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings")
  return { title: `${t("layout.title")} — ${t("nav.apiKeys")}` }
}

export default function SettingsApiKeysPage() {
  return <ApiKeysSection />
}