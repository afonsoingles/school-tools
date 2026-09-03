import { redirect } from "next/navigation"
import { AccountSettingsForm } from "@/components/settings/account-settings-form"
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

  return <AccountSettingsForm userName={userName} userEmail={userEmail} />
}