import { TestSheetsSection } from "@/components/settings/test-sheets-section"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings")
  return { title: `${t("layout.title")} — ${t("nav.testSheets")}` }
}

export default function SettingsTestSheetsPage() {
  return <TestSheetsSection />
}