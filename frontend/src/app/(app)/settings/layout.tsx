import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/layout/page-header"
import { SettingsNav } from "@/components/settings/settings-nav"
import { serverApiFetch } from "@/lib/api/server-client"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings")

  let testSheetsEnabled = true
  try {
    const res = await serverApiFetch<{ success: boolean; enabled: boolean }>("/v1/test-sheets")
    testSheetsEnabled = res.enabled
  } catch {
    testSheetsEnabled = true
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col">
        <PageHeader
          className="max-md:hidden"
          title={t("layout.title")}
          subtitle={t("layout.subtitle")}
        />
        <SettingsNav testSheetsEnabled={testSheetsEnabled} />
        <div className="flex flex-col px-4 pb-[max(env(safe-area-inset-bottom),1rem)] md:px-8 md:pb-6">{children}</div>
      </div>
    </div>
  )
}