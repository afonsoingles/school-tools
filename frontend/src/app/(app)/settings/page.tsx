import { PageHeader } from "@/components/layout/page-header"
import { SettingsTabs } from "@/components/settings/settings-tabs"

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your settings" />
      <div className="flex-1 px-8 pb-6">
        <SettingsTabs />
      </div>
    </>
  )
}
