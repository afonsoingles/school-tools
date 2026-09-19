import { redirect } from "next/navigation"
import { AccountSettingsForm } from "@/components/settings/account-settings-form"
import { DangerZoneSection } from "@/components/settings/danger-zone-section"
import { getCurrentUser } from "@/lib/api/auth"

export default async function AccountSettingsPage() {
  let userName: string
  let userEmail: string
  try {
    const user = await getCurrentUser()
    userName = user.name
    userEmail = user.email
  } catch {
    redirect("/api/auth/clear-session")
  }

  return (
    <div className="flex flex-col gap-6">
      <AccountSettingsForm userName={userName} userEmail={userEmail} />
      <DangerZoneSection />
    </div>
  )
}