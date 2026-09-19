import { SubjectsManager } from "@/components/settings/subjects-manager"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings")
  return { title: `${t("layout.title")} — ${t("nav.subjects")}` }
}

export default function SettingsSubjectsPage() {
  return <SubjectsManager />
}