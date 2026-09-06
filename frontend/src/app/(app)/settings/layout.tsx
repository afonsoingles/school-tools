import { PageHeader } from "@/components/layout/page-header"
import { SettingsNav } from "@/components/settings/settings-nav"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col">
        <PageHeader
          className="max-md:hidden"
          title="Settings"
          subtitle="Manage your settings"
        />
        <SettingsNav />
        <div className="flex flex-col px-4 pb-[max(env(safe-area-inset-bottom),1rem)] md:px-8 md:pb-6">{children}</div>
      </div>
    </div>
  )
}