import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/layout/page-header"
import { SettingsNav } from "@/components/settings/settings-nav"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings")

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col">
        <PageHeader
          className="max-md:hidden"
          title={t("layout.title")}
          subtitle={t("layout.subtitle")}
        />
        <SettingsNav />
        <div className="flex flex-col px-4 pb-[max(env(safe-area-inset-bottom),1rem)] md:px-8 md:pb-6">{children}</div>
      </div>
    </div>
  )
}