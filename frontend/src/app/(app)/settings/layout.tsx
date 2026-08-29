import { PageHeader } from "@/components/layout/page-header"
import { SettingsNav } from "@/components/settings/settings-nav"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your settings" />
      <SettingsNav />
      <div className="flex flex-1 flex-col gap-4 px-8 pb-6">{children}</div>
    </>
  )
}