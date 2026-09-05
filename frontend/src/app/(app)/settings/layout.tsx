import { PageHeader } from "@/components/layout/page-header"
import { SettingsNav } from "@/components/settings/settings-nav"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your settings" />
      <SettingsNav />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col px-8 pb-6">{children}</div>
      </div>
    </>
  )
}